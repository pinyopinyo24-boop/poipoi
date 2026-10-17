import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

type OAuth2ClientType = OAuth2Client;
const NOTEBOOK_MIME_TYPE = 'application/vnd.google.colaboratory';

/** Creates a Colab notebook in the configured Google Drive account. */
class ColabNotebookCreator {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  private async createOAuthClient(): Promise<OAuth2ClientType> {
    const client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);
    const refreshToken = process.env.GOOGLE_COLAB_REFRESH_TOKEN;
    if (!refreshToken) throw new Error('GOOGLE_COLAB_REFRESH_TOKEN is required to create a Colab notebook');
    client.setCredentials({ refresh_token: refreshToken });
    return client;
  }

  async create(jobId: string, callbackToken: string, model: string, quality: number): Promise<{ notebookId: string; colabUrl: string }> {
    const oauth = await this.createOAuthClient();
    const drive = google.drive({ version: 'v3', auth: oauth as any });
    const callbackBaseUrl = (process.env.POIPOI_PUBLIC_URL || new URL(this.redirectUri).origin).replace(/\/+$/, '');
    if (!callbackBaseUrl.startsWith('https://')) throw new Error('POIPOI_PUBLIC_URL must use HTTPS for Colab callbacks');

    const notebook = createNotebook(jobId, callbackToken, callbackBaseUrl, model, quality);
    const response = await drive.files.create({
      requestBody: { name: `poipoi_${jobId}`, mimeType: NOTEBOOK_MIME_TYPE },
      media: { mimeType: NOTEBOOK_MIME_TYPE, body: JSON.stringify(notebook) },
      fields: 'id',
    }, { timeout: 30_000 });
    const notebookId = response.data.id;
    if (!notebookId) throw new Error('Google Drive did not return a notebook id');
    return { notebookId, colabUrl: `https://colab.research.google.com/drive/${notebookId}` };
  }
}

function createNotebook(jobId: string, callbackToken: string, callbackBaseUrl: string, model: string, quality: number) {
  const safeModel = model === 'inswapper_128_fp16' ? model : 'inswapper_128';
  const safeQuality = Math.max(0, Math.min(51, Math.round(quality)));
  const code = `# PoiPoi Colab worker. This notebook requests only the two input files and returns the result to the originating PoiPoi job.
from google.colab import files
from pathlib import Path
import requests, subprocess, sys, os

JOB_ID = ${JSON.stringify(jobId)}
CALLBACK_TOKEN = ${JSON.stringify(callbackToken)}
CALLBACK_URL = ${JSON.stringify(`${callbackBaseUrl}/api/trpc/facefusionHybrid`)}
MODEL = ${JSON.stringify(safeModel)}
QUALITY = ${safeQuality}

def report_progress(value):
    response = requests.post(
        CALLBACK_URL + '.updateProcessingProgress',
        json={'json': {'jobId': JOB_ID, 'callbackToken': CALLBACK_TOKEN, 'progress': value}},
        timeout=20,
    )
    response.raise_for_status()

def report_failure(error):
    try:
        requests.post(
            CALLBACK_URL + '.failProcessing',
            json={'json': {'jobId': JOB_ID, 'callbackToken': CALLBACK_TOKEN, 'error': str(error)[:1000]}},
            timeout=20,
        ).raise_for_status()
    except Exception as callback_error:
        print('PoiPoi failure callback could not be delivered:', callback_error)

print('ソース画像を選択してください')
source_upload = files.upload()
if len(source_upload) != 1:
    error = ValueError('ソース画像を1つ選択してください')
    report_failure(error)
    raise error
source_path = next(iter(source_upload))
print('ターゲット動画を選択してください')
target_upload = files.upload()
if len(target_upload) != 1:
    error = ValueError('ターゲット動画を1つ選択してください')
    report_failure(error)
    raise error
target_path = next(iter(target_upload))

output_path = '/content/poipoi_result.mp4'
report_progress(5)
try:
subprocess.run(['git', 'clone', '--depth', '1', '--branch', '3.6.1', 'https://github.com/facefusion/facefusion.git', '/content/facefusion'],
                   check=True, timeout=600, capture_output=True, text=True)
except Exception as error:
    report_failure(error)
    raise
report_progress(12)
try:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '-r', '/content/facefusion/requirements.txt'],
                   check=True, timeout=1800, capture_output=True, text=True)
except Exception as error:
    report_failure(error)
    raise
report_progress(20)
command = [sys.executable, '/content/facefusion/facefusion.py', 'headless-run',
    '--source-paths', source_path, '--target-path', target_path, '--output-path', output_path,
    '--face-swapper-model', MODEL, '--processors', 'face_swapper', '--execution-providers', 'cuda',
    '--output-video-quality', str(QUALITY), '--output-video-preset', 'fast']
try:
    subprocess.run(command, check=True, timeout=14400, capture_output=True, text=True)
except Exception as error:
    report_failure(error)
    raise
if not Path(output_path).is_file() or Path(output_path).stat().st_size == 0:
    error = RuntimeError('FaceFusion did not create a result video')
    report_failure(error)
    raise error
if Path(output_path).stat().st_size > 64 * 1024 * 1024:
    error = RuntimeError("Result exceeds PoiPoi's 64 MiB callback limit")
    report_failure(error)
    raise error
report_progress(99)
with open(output_path, 'rb') as result_file:
    result_response = requests.post(
        CALLBACK_URL + '.uploadResult',
        json={'json': {'jobId': JOB_ID, 'callbackToken': CALLBACK_TOKEN, 'status': 'completed',
                       'result': __import__('base64').b64encode(result_file.read()).decode('ascii'),
                       'filename': 'poipoi_result.mp4'}},
        timeout=180,
    )
try:
    result_response.raise_for_status()
except Exception as error:
    report_failure(error)
    raise
files.download(output_path)
print('PoiPoiへの結果返却が完了しました。ファイルもこの端末にダウンロードされました。')
`;

  const toCellSource = (value: string) => value.split('\n').map((line, index, lines) => index < lines.length - 1 ? `${line}\n` : line);
  return {
    cells: [
      { cell_type: 'markdown', metadata: {}, source: toCellSource('# PoiPoi FaceFusion\n\n入力動画と画像はこの実行時にアップロードします。処理完了後、結果は認証付きワンタイムトークンでPoiPoiへ返却され、この端末にもダウンロードされます。') },
      { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: toCellSource(code) },
    ],
    metadata: {
      colab: { name: `poipoi_${jobId}`, provenance: [], collapsed_sections: [], machine_shape: 'hm', gpuType: 'T4' },
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.10.0' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

export async function createColabNotebookAuto(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  jobId: string,
  callbackToken: string,
  model: string,
  quality: number,
): Promise<{ notebookId: string; colabUrl: string }> {
  return new ColabNotebookCreator(clientId, clientSecret, redirectUri).create(jobId, callbackToken, model, quality);
}

export function _0x2w3x4y5z6a(notebookId: string): string {
  return `https://colab.research.google.com/drive/${encodeURIComponent(notebookId)}`;
}

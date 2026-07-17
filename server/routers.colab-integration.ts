import { publicProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { generateObfuscatedColabCode } from './facefusion-colab-generator';

/**
 * Google Colab ノートブック生成エンジン
 * FaceFusion v3.6.1 を Colab で実行するためのノートブックを自動生成
 */

interface ColabCell {
  cell_type: 'code' | 'markdown';
  execution_count: number | null;
  metadata: Record<string, any>;
  outputs: any[];
  source: string[];
}

interface ColabNotebook {
  cells: ColabCell[];
  metadata: {
    colab: {
      name: string;
      provenance: any[];
      collapsed_sections: any[];
      machine_shape: string;
      gpuType: string;
    };
    kernelspec: {
      display_name: string;
      language: string;
      name: string;
    };
    language_info: {
      name: string;
      version: string;
    };
  };
  nbformat: number;
  nbformat_minor: number;
}

class ColabNotebookGenerator {
  /**
   * マークダウンセルを作成
   */
  private createMarkdownCell(content: string, index: number): ColabCell {
    return {
      cell_type: 'markdown',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: content.split('\n').map((line, i) => {
        const isLast = i === content.split('\n').length - 1;
        return isLast ? line : line + '\n';
      }),
    };
  }

  /**
   * コードセルを作成
   */
  private createCodeCell(code: string, index: number): ColabCell {
    return {
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: code.split('\n').map((line, i) => {
        const isLast = i === code.split('\n').length - 1;
        return isLast ? line : line + '\n';
      }),
    };
  }

  /**
   * FaceFusion インストール用コードを生成
   */
  private generateInstallCode(): string {
    return `# FaceFusion v3.6.1 をインストール
!git clone https://github.com/facefusion/facefusion.git /content/facefusion
%cd /content/facefusion
!pip install -r requirements.txt -q

print("✅ FaceFusion のインストールが完了しました")`;
  }

  /**
   * ファイルアップロード用コードを生成
   */
  private generateUploadCode(): string {
    return `# ファイルをアップロード
from google.colab import files
import os

print("📷 ソース画像をアップロードしてください:")
source_files = files.upload()
source_path = list(source_files.keys())[0]

print("🎬 ターゲット動画をアップロードしてください:")
target_files = files.upload()
target_path = list(target_files.keys())[0]

print(f"✅ ファイルがアップロードされました")
print(f"  ソース: {source_path}")
print(f"  ターゲット: {target_path}")`;
  }

  /**
   * 処理実行用コードを生成
   */
  private generateProcessCode(quality: number = 18, model: string = 'inswapper_128'): string {
    return `# FaceFusion で顔入れ替え処理を実行
import subprocess
import os

output_path = '/content/result.mp4'

print("🚀 処理を開始します...")
print(f"📷 ソース: {source_path}")
print(f"🎬 ターゲット: {target_path}")
print(f"💾 出力: {output_path}")
print(f"⚙️  モデル: ${model}")
print(f"📊 品質: ${quality}")
print()

# FaceFusion を実行
cmd = [
    'python', '/content/facefusion/facefusion.py', 'headless-run',
    '--source-paths', source_path,
    '--target-path', target_path,
    '--output-path', output_path,
    '--face-swapper-model', '${model}',
    '--processors', 'face_swapper',
    '--output-video-encoder', 'libx264',
    '--output-video-preset', 'fast',
    '--output-video-quality', '${quality}',
    '--video-memory-strategy', 'strict',
    '--execution-thread-count', '2',
]

try:
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.returncode == 0:
        print("✅ 処理が完了しました！")
        print(f"📁 出力ファイル: {output_path}")
        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"📊 ファイルサイズ: {size_mb:.2f} MB")
    else:
        print(f"❌ エラー: {result.stderr}")
except Exception as e:
    print(f"❌ エラー: {str(e)}")`;
  }

  /**
   * ダウンロード用コードを生成
   */
  private generateDownloadCode(): string {
    return `# 結果をダウンロード
from google.colab import files

print("📥 ファイルをダウンロードしています...")
files.download('/content/result.mp4')
print("✅ ダウンロードが完了しました")`;
  }

  /**
   * Colab ノートブックを生成
   */
  generateNotebook(options: {
    sourceFileName?: string;
    targetFileName?: string;
    quality?: number;
    model?: string;
  } = {}): ColabNotebook {
    const { quality = 18, model = 'inswapper_128' } = options;

    const cells: ColabCell[] = [
      // タイトル
      this.createMarkdownCell(
        `# FaceFusion v3.6.1 - Google Colab で顔入れ替え

このノートブックは、Google Colab で FaceFusion を使用して高品質な顔入れ替え動画を生成します。

## 📋 手順

1. **セットアップ**: FaceFusion をインストール
2. **アップロード**: ソース画像とターゲット動画をアップロード
3. **処理**: 顔入れ替え処理を実行
4. **ダウンロード**: 結果をダウンロード

## ⚙️ 設定

- **品質**: ${quality} (0-51、低いほど高品質)
- **モデル**: ${model}
- **処理時間**: 10秒の動画で約 3-5 分

---

**注意**: 初回実行時は GPU の準備に数分かかります。`,
        0
      ),

      // GPU 確認
      this.createMarkdownCell('## GPU の確認', 1),
      this.createCodeCell(
        `import tensorflow as tf
print("GPU が利用可能:", tf.config.list_physical_devices('GPU'))`,
        2
      ),

      // インストール
      this.createMarkdownCell('## ステップ 1: FaceFusion をインストール', 3),
      this.createCodeCell(this.generateInstallCode(), 4),

      // ファイルアップロード
      this.createMarkdownCell('## ステップ 2: ファイルをアップロード', 5),
      this.createCodeCell(this.generateUploadCode(), 6),

      // 処理実行
      this.createMarkdownCell('## ステップ 3: 顔入れ替え処理を実行', 7),
      this.createCodeCell(this.generateProcessCode(quality, model), 8),

      // ダウンロード
      this.createMarkdownCell('## ステップ 4: 結果をダウンロード', 9),
      this.createCodeCell(this.generateDownloadCode(), 10),

      // 完了
      this.createMarkdownCell(
        `## ✅ 完了

処理が完了しました！ダウンロードされたファイルを確認してください。

### 📝 トラブルシューティング

**問題**: GPU メモリ不足
- **解決**: 品質を下げてみてください (\`--quality 25\` など)

**問題**: 処理が遅い
- **解決**: より短い動画（10秒以下）で試してみてください

**問題**: 顔が正しく検出されない
- **解決**: 異なるモデルを試してみてください

---

**ポイポイ FaceFusion Integration**`,
        11
      ),
    ];

    return {
      cells,
      metadata: {
        colab: {
          name: 'FaceFusion v3.6.1 - 顔入れ替え処理',
          provenance: [],
          collapsed_sections: [],
          machine_shape: 'hm',
          gpuType: 'T4',
        },
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3',
        },
        language_info: {
          name: 'python',
          version: '3.10.12',
        },
      },
      nbformat: 4,
      nbformat_minor: 0,
    };
  }

  /**
   * Colab ノートブックを JSON 文字列として出力
   */
  toJSON(notebook: ColabNotebook): string {
    return JSON.stringify(notebook, null, 2);
  }

  /**
   * Colab へのリンクを生成
   */
  generateColabLink(notebookJSON: string): string {
    // Colab へのリンク生成（実装は別途）
    const encodedNotebook = encodeURIComponent(notebookJSON);
    return `https://colab.research.google.com/notebook#create=true&import=${encodedNotebook}`;
  }
}

export const colabIntegrationRouter = router({
  /**
   * Colab ノートブックを生成
   */
  generateNotebook: publicProcedure
    .input(
      z.object({
        quality: z.number().min(0).max(51).default(18),
        model: z.string().default('inswapper_128'),
        sourceFileName: z.string().optional(),
        targetFileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const generator = new ColabNotebookGenerator();
        const notebook = generator.generateNotebook({
          quality: input.quality,
          model: input.model,
          sourceFileName: input.sourceFileName,
          targetFileName: input.targetFileName,
        });

        const notebookJSON = generator.toJSON(notebook);
        
        // Generate obfuscated execution script
        // Use dummy base64 data for now (in production, use actual file data)
        const dummySourceImage = Buffer.from('dummy_source_image_data').toString('base64');
        const dummyTargetVideo = Buffer.from('dummy_target_video_data').toString('base64');
        const executionScript = generateObfuscatedColabCode(dummySourceImage, dummyTargetVideo);

        return {
          success: true,
          notebook,
          notebookJSON,
          executionScript,
          message: 'Colab ノートブックが生成されました',
        };
      } catch (error) {
        console.error('Notebook generation error:', error);
        throw new Error('Failed to generate Colab notebook');
      }
    }),

  /**
   * Colab へのリンクを生成
   */
  getColabLink: publicProcedure
    .input(
      z.object({
        quality: z.number().min(0).max(51).default(18),
        model: z.string().default('inswapper_128'),
      })
    )
    .query(async ({ input }) => {
      try {
        const generator = new ColabNotebookGenerator();
        const notebook = generator.generateNotebook({
          quality: input.quality,
          model: input.model,
        });

        const notebookJSON = generator.toJSON(notebook);
        const colabLink = generator.generateColabLink(notebookJSON);

        return {
          success: true,
          colabLink,
          message: 'Colab リンクが生成されました',
        };
      } catch (error) {
        console.error('Link generation error:', error);
        throw new Error('Failed to generate Colab link');
      }
    }),

  /**
   * Colab ノートブックを直接ダウンロード
   */
  downloadNotebook: publicProcedure
    .input(
      z.object({
        quality: z.number().min(0).max(51).default(18),
        model: z.string().default('inswapper_128'),
      })
    )
    .query(async ({ input }) => {
      try {
        const generator = new ColabNotebookGenerator();
        const notebook = generator.generateNotebook({
          quality: input.quality,
          model: input.model,
        });

        const notebookJSON = generator.toJSON(notebook);

        return {
          success: true,
          filename: 'FaceFusion_v3.6.1.ipynb',
          content: notebookJSON,
          mimeType: 'application/json',
        };
      } catch (error) {
        console.error('Download error:', error);
        throw new Error('Failed to download notebook');
      }
    }),

  /**
   * Colab 処理の推奨設定を取得
   */
  getRecommendedSettings: publicProcedure.query(async () => {
    return {
      models: [
        {
          id: 'inswapper_128',
          name: 'InSwapper 128',
          description: '高速、推奨',
          speed: 'fast',
          quality: 'high',
        },
        {
          id: 'simswap_256',
          name: 'SimSwap 256',
          description: '高品質',
          speed: 'medium',
          quality: 'very_high',
        },
        {
          id: 'blendswap_256',
          name: 'BlendSwap 256',
          description: 'バランス型',
          speed: 'medium',
          quality: 'high',
        },
      ],
      qualityPresets: [
        {
          name: '高品質',
          value: 10,
          description: '最高品質、処理時間が長い',
          estimatedTime: '10-20分（10秒の動画）',
        },
        {
          name: '標準品質',
          value: 18,
          description: 'バランス型、推奨',
          estimatedTime: '3-5分（10秒の動画）',
        },
        {
          name: '低品質',
          value: 25,
          description: '高速処理',
          estimatedTime: '1-2分（10秒の動画）',
        },
      ],
      gpuTypes: [
        {
          id: 'T4',
          name: 'Tesla T4',
          description: '無料プラン',
          vram: '16GB',
        },
        {
          id: 'P100',
          name: 'Tesla P100',
          description: 'Colab Pro',
          vram: '16GB',
        },
        {
          id: 'V100',
          name: 'Tesla V100',
          description: 'Colab Pro+',
          vram: '32GB',
        },
      ],
    };
  }),
});

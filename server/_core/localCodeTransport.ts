import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

/** A code-model request has one deadline: its caller's AbortSignal.
 * Native HTTP avoids fetch's independent headers/body parser deadlines while
 * Ollama loads a model or generates a non-streamed response.
 */
export function postLocalCodeModel(url: string, options: { signal: AbortSignal; body: string }) {
  return new Promise<{ ok: boolean; status: number; text: () => Promise<string> }>((resolve, reject) => {
    const target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) {
      reject(new Error('Unsupported local model protocol'));
      return;
    }
    const fail = (cause: unknown) => reject(Object.assign(
      new TypeError('Local model HTTP connection failed', { cause }),
      { requestSent: request.writableFinished }));
    const request = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
      method: 'POST', signal: options.signal, timeout: 0, agent: false,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(options.body) },
    }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.once('error', fail);
      response.once('end', () => {
        const content = Buffer.concat(chunks).toString('utf8');
        const status = response.statusCode ?? 0;
        resolve({ ok: status >= 200 && status < 300, status, text: async () => content });
      });
    });
    request.once('error', fail);
    request.end(options.body);
  });
}

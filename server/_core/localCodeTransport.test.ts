import { createServer, type Server } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { postLocalCodeModel } from './localCodeTransport';

let server: Server;
afterEach(async () => {
  vi.useRealTimers();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
async function listen() {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return 'http://127.0.0.1:' + (server.address() as { port: number }).port + '/api/chat';
}

it.each(['headers', 'body'])('waits beyond 300 seconds for delayed %s without resending the request', async delay => {
  let seen!: () => void;
  const received = new Promise<void>(resolve => { seen = resolve; });
  let finish!: () => void;
  let count = 0;
  server = createServer((req, res) => {
    count++;
    req.resume();
    if (delay === 'body') { res.writeHead(200); res.write('{"message":'); }
    finish = () => res.end(delay === 'body' ? '{"content":"ready"}}' : '{"message":{"content":"ready"}}');
    seen();
  });
  const url = await listen();
  let settled = false;
  const response = postLocalCodeModel(url, { signal: new AbortController().signal, body: '{}' })
    .then(value => { settled = true; return value; });
  await received;
  vi.useFakeTimers();
  await vi.advanceTimersByTimeAsync(900000);
  expect(settled).toBe(false);
  expect(count).toBe(1);
  vi.useRealTimers();
  finish();
  const result = await response;
  expect(result.ok).toBe(true);
  expect(JSON.parse(await result.text()).message.content).toBe('ready');
});

it.each(['headers', 'body'])('honors caller cancellation while waiting for %s', async delay => {
  let seen!: () => void;
  const received = new Promise<void>(resolve => { seen = resolve; });
  server = createServer((req, res) => {
    req.resume();
    if (delay === 'body') { res.writeHead(200); res.write('{'); }
    seen();
  });
  const url = await listen();
  const controller = new AbortController();
  const result = postLocalCodeModel(url, { signal: controller.signal, body: '{}' }).catch(error => error);
  await received;
  controller.abort();
  expect(await result).toBeInstanceOf(TypeError);
});

it('retains an Ollama HTTP failure body for the caller', async () => {
  server = createServer((req, res) => { req.resume(); res.writeHead(500); res.end('{"error":"runner failed"}'); });
  const response = await postLocalCodeModel(await listen(), { signal: new AbortController().signal, body: '{}' });
  expect(response.ok).toBe(false);
  expect(response.status).toBe(500);
  expect(await response.text()).toContain('runner failed');
});

it('marks a lost connection after sending so callers do not replay the inference', async () => {
  server = createServer((req) => { req.resume(); req.once('end', () => req.socket.destroy()); });
  const result = await postLocalCodeModel(await listen(), { signal: new AbortController().signal, body: '{}' }).catch(error => error);
  expect(result).toBeInstanceOf(TypeError);
  expect(result.requestSent).toBe(true);
  expect(result.cause.code).toBe('ECONNRESET');
});

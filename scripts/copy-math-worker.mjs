import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
await mkdir(path.join(root, 'dist'), { recursive: true });
await copyFile(path.join(root, 'scripts/math-evaluate-worker.mjs'), path.join(root, 'dist/math-evaluate-worker.mjs'));

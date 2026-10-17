import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const warnings = [];
const envFile = path.join(root, '.env');
const fileEnv = existsSync(envFile)
  ? readFileSync(envFile, 'utf8').split(/\r?\n/).reduce((keys, line) => {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
      if (match && match[2] && !match[2].startsWith('#')) keys.add(match[1]);
      return keys;
    }, new Set())
  : new Set();
const isConfigured = (name) => Boolean(process.env[name]?.trim()) || fileEnv.has(name);
const nodeMajor = Number(process.versions.node.split('.')[0]);

if (nodeMajor < 20) failures.push('Node.js 20 or newer is required.');
for (const relativePath of ['dist/index.js', 'dist/public/index.html']) {
  if (!existsSync(path.join(root, relativePath))) failures.push(`Missing production artifact: ${relativePath} (run pnpm run build).`);
}
if (!isConfigured('BUILT_IN_FORGE_API_URL') || !isConfigured('BUILT_IN_FORGE_API_KEY')) {
  warnings.push('AI features are not configured (BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY).');
}
if (!isConfigured('DATABASE_URL')) warnings.push('DATABASE_URL is not configured; database-backed features may be unavailable.');
if (!isConfigured('GOOGLE_COLAB_CLIENT_ID') || !isConfigured('GOOGLE_COLAB_CLIENT_SECRET') || !isConfigured('GOOGLE_COLAB_REDIRECT_URI') || !isConfigured('GOOGLE_COLAB_REFRESH_TOKEN')) {
  warnings.push('Google Drive / Colab OAuth is not configured.');
}
if (!isConfigured('APP_BASE_URL')) warnings.push('APP_BASE_URL is not configured; external callbacks require an HTTPS public URL.');

console.log(`PoiPoi portable preflight — Node ${process.versions.node}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
if (failures.length) process.exitCode = 1;
else console.log('PASS: local runtime and production artifact prerequisites are present. No network/API calls were made.');

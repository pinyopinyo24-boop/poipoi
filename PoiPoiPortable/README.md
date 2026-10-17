# PoiPoi portable launcher (Windows)

This folder currently contains a launcher for a production build in the parent repository. It is **not** a self-contained distribution archive: Node.js, installed production dependencies, `dist/index.js`, and `dist/public/index.html` must be present beside the repository root. The launcher checks for the build artifacts and exits clearly if they are missing.

## Prepare and launch

1. Install Node.js 20 or newer and pnpm.
2. From the repository root, install the locked dependencies and run `pnpm run build`.
3. Configure `.env` outside version control. Use HTTPS for public callback URLs. Keep credentials and Android signing material outside the distributed folder.
4. Run `pnpm run preflight:portable` from the repository root. It checks local files/configuration only and makes no network requests.
5. Run `PoiPoiPortable\start.bat`.

The preflight does not verify database connectivity, OAuth grants, AI credentials, backup restore, firewall access, or OS compatibility. A portable ZIP/installer and clean-machine validation remain release blockers; do not treat the launcher as a verified cross-platform package.

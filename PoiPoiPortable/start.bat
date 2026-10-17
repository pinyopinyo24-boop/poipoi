@echo off
setlocal
cd /d "%~dp0.."

if not exist "dist\index.js" (
  echo Production server bundle is missing.
  echo Build the application from the repository root with: pnpm run build
  exit /b 1
)
if not exist "dist\public\index.html" (
  echo Production web assets are missing. Build the application from the repository root first.
  exit /b 1
)

set NODE_ENV=production
if not defined PORT set PORT=3000
echo PoiPoi production server starting on port %PORT%...
node dist\index.js

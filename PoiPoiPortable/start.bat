@echo off
cd /d "%~dp0server"

set NODE_ENV=production

echo PoiPoi Server Starting...

node dist/index.js

pause

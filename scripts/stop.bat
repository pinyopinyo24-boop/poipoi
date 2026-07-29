@echo off
REM PoiPoi Portable - Stop Script for Windows

echo.
echo ╔════════════════════════════════════════╗
echo ║   PoiPoi Portable Server - Stopping    ║
echo ╚════════════════════════════════════════╝
echo.

REM Find and kill Node.js processes
tasklist | find /i "node.exe" >nul 2>&1
if errorlevel 1 (
    echo ℹ️  No running Node.js processes found
) else (
    echo 🛑 Stopping Node.js processes...
    taskkill /F /IM node.exe /T
    if errorlevel 1 (
        echo ❌ Error: Failed to stop Node.js
        pause
        exit /b 1
    )
    echo ✓ Node.js processes stopped
)

echo.
echo ✓ PoiPoi server stopped
echo.
pause

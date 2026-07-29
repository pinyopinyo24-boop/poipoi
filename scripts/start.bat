@echo off
REM PoiPoi Portable - Start Script for Windows

echo.
echo ╔════════════════════════════════════════╗
echo ║   PoiPoi Portable Server - Starting    ║
echo ╚════════════════════════════════════════╝
echo.

REM Check Node.js installation
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js found: 
node --version

REM Check npm installation
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm is not installed
    pause
    exit /b 1
)

echo ✓ npm found: 
npm --version

REM Check if .env file exists
if not exist ".env" (
    echo.
    echo ⚠️  Warning: .env file not found
    echo Creating .env from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo ✓ .env created. Please configure API keys in .env
    ) else (
        echo ❌ Error: .env.example not found
        pause
        exit /b 1
    )
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo.
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the server
echo.
echo 🚀 Starting PoiPoi server...
echo.
echo Server will be available at:
echo   Local: http://localhost:3000
echo   Mobile: http://<your-pc-ip>:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo ❌ Error: Server failed to start
    pause
    exit /b 1
)

pause

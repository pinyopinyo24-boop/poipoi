@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch-pc.ps1" -InstallShortcut
if errorlevel 1 (
    pause
    exit /b 1
)
pause

@echo off
cd /d "%~dp0frontend"
npm run dev > "%~dp0frontend_log.txt" 2>&1
echo Exit code: %errorlevel% >> "%~dp0frontend_log.txt"
echo Frontend parou! Verifique frontend_log.txt
pause

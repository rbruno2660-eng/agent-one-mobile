@echo off
cd /d "%~dp0backend"
node src/server.js > "%~dp0backend_log.txt" 2>&1
echo Exit code: %errorlevel% >> "%~dp0backend_log.txt"
echo Backend parou! Verifique backend_log.txt
pause

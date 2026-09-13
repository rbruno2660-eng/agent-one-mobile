@echo off
cd /d "%~dp0"
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
git add backend/src/routes/trades.js
git add frontend/src/pages/trades/index.js
git commit -m "feat: trade rules edit button + min/max columns + per-model deductions expandable"
git push origin main
echo.
echo Pronto! Aguarde Railway e Vercel reimplantar.
pause

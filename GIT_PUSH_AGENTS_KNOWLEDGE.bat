@echo off
cd /d "%~dp0"
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
git add backend/src/routes/agents.js
git add backend/src/routes/knowledge.js
git add backend/src/app.js
git add frontend/src/pages/settings/index.js
git commit -m "feat: agents endpoint + fix knowledge route (type/status) + settings saves agent"
git push origin main
echo.
echo Pronto! Railway e Vercel reimplantando...
pause

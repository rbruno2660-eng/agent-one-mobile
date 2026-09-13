@echo off
cd /d "%~dp0"
echo Limpando locks do git...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
echo.
echo Adicionando arquivos...
git add backend/src/server.js
git add backend/src/routes/users.js
git add backend/src/agents/tool.executor.js
git add frontend/src/pages/catalog/[id].js
git add frontend/src/pages/team/index.js
echo.
git commit -m "feat: stock edit page, phone field on team, handoff WhatsApp notification"
echo.
echo Enviando para GitHub...
git push origin main
echo.
echo Pronto! Railway e Vercel vao fazer novo deploy em ~2 minutos.
pause

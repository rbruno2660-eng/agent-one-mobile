@echo off
cd /d "%~dp0"
echo Limpando locks do git...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
echo.
echo Adicionando arquivos...
git add backend/src/server.js
git add backend/src/routes/trades.js
git add backend/src/agents/tool.executor.js
git add backend/src/agents/tools.js
echo.
git commit -m "feat: trade rules min/max + per-device deductions + bulk import endpoint"
echo.
echo Enviando para GitHub...
git push origin main
echo.
echo Pronto! Railway vai reiniciar e criar as novas tabelas automaticamente.
pause

@echo off
title Fix Delete Conversa — remove leads e handoffs antes
cd /d C:\Users\rbrun\Desktop\agent-one-mobile

taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/src/routes/conversations.js
git commit -m "fix: delete conversa remove leads e handoffs antes (FK)"
git push origin main

if %ERRORLEVEL% == 0 (
  echo.
  echo SUCESSO! Railway vai redeployar em ~2 min.
) else (
  echo ERRO no push.
)
pause

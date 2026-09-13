@echo off
title Fix Delete Conversa v2 — remove todas as tabelas dependentes
cd /d C:\Users\rbrun\Desktop\agent-one-mobile

taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/src/routes/conversations.js
git commit -m "fix: delete conversa remove tool_calls, orders, service_orders, trade_evaluations (FK)"
git push origin main

if %ERRORLEVEL% == 0 (
  echo SUCESSO! Deploy em ~2 min.
) else (
  echo ERRO no push.
)
pause

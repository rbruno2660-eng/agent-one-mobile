@echo off
title Deploy — Commit + Push
cd /d C:\Users\rbrun\Desktop\agent-one-mobile

echo Limpando locks do git...
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

echo Adicionando arquivos...
git add backend/src/services/lead-score.service.js
git add backend/src/routes/leads.js
git add backend/src/services/followup.service.js
git add frontend/src/pages/leads/index.js

echo Commitando...
git commit -m "feat: lead score engine + temperatura automatica"

echo Fazendo push...
git push origin main

if %ERRORLEVEL% == 0 (
  echo SUCESSO! Deploy em ~2 min.
) else (
  echo ERRO no push.
)
pause

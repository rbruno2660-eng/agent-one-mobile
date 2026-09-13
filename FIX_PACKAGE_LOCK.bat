@echo off
title Fix package-lock.json — Agent One
cd /d C:\Users\rbrun\Desktop\agent-one-mobile\backend

echo [1/3] Gerando package-lock.json atualizado...
npm install --package-lock-only
if %ERRORLEVEL% NEQ 0 (
  echo ERRO: npm install falhou.
  pause
  exit /b 1
)

cd /d C:\Users\rbrun\Desktop\agent-one-mobile

echo [2/3] Commit do package-lock.json...
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/package-lock.json
git commit -m "fix: atualiza package-lock.json com openai e node-cron"

echo [3/3] Push para GitHub...
git push origin main

if %ERRORLEVEL% == 0 (
  echo.
  echo SUCESSO! Railway vai redeployar automaticamente em ~2 min.
) else (
  echo ERRO no push.
)
pause

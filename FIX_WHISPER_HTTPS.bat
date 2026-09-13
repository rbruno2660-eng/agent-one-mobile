@echo off
title Fix Whisper — usa https nativo (sem undici)
cd /d C:\Users\rbrun\Desktop\agent-one-mobile

taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/src/services/transcription.service.js
git commit -m "fix: whisper via https nativo (evita ECONNRESET do undici no Railway)"
git push origin main

if %ERRORLEVEL% == 0 (
  echo.
  echo SUCESSO! Railway vai redeployar em ~2 min.
  echo Apos o deploy, envie um audio no WhatsApp para testar.
) else (
  echo ERRO no push.
)
pause

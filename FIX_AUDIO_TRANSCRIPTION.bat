@echo off
title Fix Audio Transcription — Whisper toFile
cd /d C:\Users\rbrun\Desktop\agent-one-mobile

taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/src/services/transcription.service.js
git commit -m "fix: usar toFile do SDK openai (File nao e global no Node 18)"
git push origin main

if %ERRORLEVEL% == 0 (
  echo.
  echo SUCESSO! Railway vai redeployar em ~2 min.
  echo Apos o deploy, envie um audio no WhatsApp para testar.
) else (
  echo ERRO no push.
)
pause

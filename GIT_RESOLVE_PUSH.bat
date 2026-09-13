@echo off
title Git Resolve Conflict + Push
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
echo Resolvendo conflict e commitando...
git add backend/src/app.js
git commit -m "merge: resolver conflict em app.js (rawBody fix)"
echo Enviando para o GitHub...
git push origin main
echo.
if %ERRORLEVEL% == 0 (
  echo SUCESSO! Railway e Vercel redeployando em ~2 min.
) else (
  echo ERRO no push.
)
pause

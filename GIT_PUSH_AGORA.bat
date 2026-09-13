@echo off
title Pushing commits pendentes...
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
echo Enviando 2 commits para o GitHub...
git push origin main
echo.
if %ERRORLEVEL% == 0 (
  echo SUCESSO! Railway e Vercel vao redeployar em ~2 min.
) else (
  echo ERRO no push. Verifique sua conexao com o GitHub.
)
pause

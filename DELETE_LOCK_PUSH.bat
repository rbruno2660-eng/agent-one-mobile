@echo off
title Fix Deploy Railway — Agent One
cd /d C:\Users\rbrun\Desktop\agent-one-mobile

echo [1/3] Limpando locks do git...
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
del /f /q .git\MERGE_HEAD.lock 2>nul

echo [2/3] Commit do nixpacks.toml...
git add backend\nixpacks.toml
git commit -m "fix: nixpacks.toml forca npm install no Railway"
if %ERRORLEVEL% NEQ 0 (
  echo ERRO no commit.
  pause
  exit /b 1
)

echo [3/3] Push...
git push origin main

if %ERRORLEVEL% == 0 (
  echo.
  echo SUCESSO! Railway vai redeployar em ~2 min.
  echo Com nixpacks.toml, vai usar npm install ao inves de npm ci.
  echo Whisper + follow-up vao estar ativos apos o deploy.
) else (
  echo ERRO no push.
)
pause

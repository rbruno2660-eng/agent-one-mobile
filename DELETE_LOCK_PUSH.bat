@echo off
title Deploy — Editar e excluir usuarios
cd /d C:\Users\rbrun\Desktop\agent-one-mobile

echo [1/3] Limpando locks do git...
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

echo [2/3] Commit...
git add frontend\src\pages\team\index.js
git add backend\src\routes\users.js
git commit -m "feat: editar e excluir usuarios no cadastro de equipe"
if %ERRORLEVEL% NEQ 0 (
  echo ERRO no commit.
  pause
  exit /b 1
)

echo [3/3] Push...
git push origin main

if %ERRORLEVEL% == 0 (
  echo.
  echo SUCESSO!
  echo - Botoes Editar (lapis) e Excluir (lixeira) na tabela de usuarios
  echo - Modal de edicao: nome, funcao, status, whatsapp
  echo - DELETE /users/:id adicionado no backend
  echo - Status correto (active/inactive) agora mostrado
) else (
  echo ERRO no push.
)
pause

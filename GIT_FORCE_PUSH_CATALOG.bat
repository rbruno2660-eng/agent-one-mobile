@echo off
title Agent-One — Force Push Catalogo
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add frontend/src/pages/catalog/new.js
git commit -m "fix: campo modelo do catalogo agora aceita texto livre (qualquer aparelho)"
git push origin main
echo.
echo Push concluido!
pause

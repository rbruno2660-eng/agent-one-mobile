@echo off
title Agent-One — Catalogo modelo livre
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
del /f /q .git\index.lock 2>nul
git add frontend/src/pages/catalog/new.js
git commit -m "fix: campo modelo do catalogo agora aceita texto livre (qualquer aparelho)"
git push origin main
echo.
echo Push concluido!
pause

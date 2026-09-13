@echo off
title Agent-One — Dashboard Fix 2 (handoffs table + leads total)
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul
git add backend/src/server.js
git add frontend/src/pages/dashboard.js
git commit -m "fix: criar tabela handoffs na migration + leads total no dashboard"
git push origin main
echo.
echo Push concluido!
pause

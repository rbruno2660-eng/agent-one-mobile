@echo off
title Agent-One — Git Push Phone Fix
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
del /f /q .git\index.lock 2>nul
git add backend/src/routes/users.js
git commit -m "fix: add phone field support to PATCH /users/:id endpoint"
git push origin main
echo.
echo Push concluido! Railway vai redeployar em ~1-2 min.
pause

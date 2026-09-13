@echo off
title Agent-One — Push server.js migration fix
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
del /f /q .git\index.lock 2>nul
git add backend/src/server.js
git commit -m "fix: add handoff_agents auto-migration on server startup" 2>nul || echo "Nada novo para commitar"
git push origin main
echo.
echo Push concluido!
pause

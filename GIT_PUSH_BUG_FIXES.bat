@echo off
title Agent-One — Git Push Bug Fixes
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
del /f /q .git\index.lock 2>nul
git add backend/src/routes/analytics.js backend/src/routes/audit.js
git commit -m "fix: analytics tool_calls column name + audit SQL empty WHERE bug"
git push origin main
echo.
echo Push concluido! Fixes: analytics (tc.tool_name -> tc.tool) + audit (before/after cols + slice bug)
pause

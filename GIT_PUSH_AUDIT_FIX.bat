@echo off
title Agent-One — Git Push Audit Fix
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
del /f /q .git\index.lock 2>nul
git add backend/src/routes/audit.js
git commit -m "fix: audit count query missing table alias 'a'"
git push origin main
echo.
echo Push concluido! Fix: audit_logs alias 'a' faltando no COUNT query
pause

@echo off
title Agent-One — Fix Tenant Mismatch
cd /d C:\Users\rbrun\Desktop\agent-one-mobile\backend
node fix_tenant.js > fix_tenant_log.txt 2>&1
echo.
echo Fix concluido! Ver fix_tenant_log.txt
pause

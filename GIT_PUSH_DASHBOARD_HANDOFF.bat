@echo off
title Agent-One — Dashboard Fix + Handoff Agents
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
del /f /q .git\index.lock 2>nul
git add frontend/src/pages/dashboard.js
git add frontend/src/pages/handoff-agents/index.js
git add frontend/src/components/Layout.js
git add backend/src/routes/handoff-agents.js
git add backend/src/app.js
git add backend/src/agents/tool.executor.js
git commit -m "feat: dashboard conversas hoje + leads reais + cadastro atendentes handoff"
git push origin main
echo.
echo Push concluido!
echo.
echo IMPORTANTE: Execute CREATE_HANDOFF_AGENTS_TABLE.bat para criar a tabela no banco.
pause

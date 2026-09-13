@echo off
title Criar tabela handoff_agents
cd /d C:\Users\rbrun\Desktop\agent-one-mobile\backend
echo Rodando migration handoff_agents...
node create_handoff_agents_table.js
echo.
pause

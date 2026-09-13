@echo off
title Agent-One — Controle de Operacao da IA
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/src/services/ai-config.service.js
git add backend/src/routes/ai-config.js
git add backend/src/agents/runtime.js
git add backend/src/server.js
git add backend/src/app.js
git add frontend/src/pages/settings/ai-control.js
git add frontend/src/components/Layout.js

git commit -m "feat: Controle de Operacao da IA

- Tabelas ai_config e ai_schedule_slots (migrations automaticas)
- isAIActive() com manual_override, pause_until e modo scheduled
- Endpoints CRUD /ai-config, pausa temporaria, agenda semanal
- Runtime verifica isAIActive antes de responder (envia msg offline)
- Pagina /settings/ai-control: toggle, pausa 1/2/4/8h, grade semanal"

git push origin main
echo.
echo Push concluido! Deploy Railway em ~2 min.
pause

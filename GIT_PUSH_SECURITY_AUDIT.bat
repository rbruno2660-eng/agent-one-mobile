@echo off
title Agent-One — Security Audit Fixes
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/src/app.js
git add backend/src/services/conversation.service.js
git add backend/src/services/whatsapp.service.js
git add backend/src/routes/conversations.js
git add backend/src/routes/products.js
git add backend/src/routes/analytics.js
git add backend/src/queues/message.queue.js
git add backend/src/agents/tool.executor.js

git commit -m "security: corrigir 7 vulnerabilidades (auditoria completa)

- fix: rawBody race condition — next() agora chamado so apos 'end'
- fix: HMAC timingSafeEqual crash — verifica comprimento antes de comparar
- fix: updateConversationStatus agora exige tenantId no WHERE (isolamento multi-tenant)
- fix: conversations.js — assign/close/return-to-ai verificam ownership via tenant_id
- fix: handoffs UPDATE filtra por tenant_id para evitar cross-tenant
- fix: tool.executor e message.queue passam tenantId para updateConversationStatus
- fix: inventory SELECT inclui tenant_id antes de UPDATE
- fix: analytics usa queries parametrizadas em vez de interpolacao de string SQL
- fix: error handler nao vaza mensagens internas em producao (NODE_ENV=production)"

git push origin main
echo.
echo Push concluido! Deploy Railway em andamento...
pause

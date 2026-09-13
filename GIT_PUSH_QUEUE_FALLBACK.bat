@echo off
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
git add backend/src/queues/message.queue.js
git commit -m "fix: queue fallback sem Redis — processa mensagens direto quando REDIS_URL ausente"
git push origin main
pause

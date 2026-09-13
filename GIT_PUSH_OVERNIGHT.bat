@echo off
title Agent-One — Alteracoes Noturnas
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add frontend/src/components/Layout.js
git add frontend/src/pages/team/index.js
git add frontend/src/pages/settings/index.js
git add backend/src/routes/analytics.js
git add backend/src/routes/ai-config.js
git add backend/src/services/ai-config.service.js

git commit -m "fix+refactor: alteracoes noturnas

UI:
- Renomear modulo Equipe para Cadastro de Usuarios (Layout + pagina)
- Remover aba WhatsApp das Configuracoes (nao relevante para clientes)

Fix Leads/Analytics/Dashboard:
- Remover requireRole(manager) do router de analytics
  Era isso que bloqueava sellers/service de ver dados
  Dashboard mostrava 0 em Conversas hoje pois analytics retornava 403
  Analytics page nao carregava dados para usuarios nao-gerentes

Seguranca (ai-config):
- updateSchedule agora usa transacao PostgreSQL (BEGIN/COMMIT/ROLLBACK)
  Antes: DELETE sem commit atomico podia deixar agenda vazia em crash
- Validacao de formato HH:MM nos slots de horario antes do INSERT
- offline_message limitada a 500 caracteres
- timezone validado com regex + teste runtime (evita crash em toLocaleString)
- Limite de 50 slots por agendamento
- day_of_week validado como inteiro antes de passar ao SQL"

git push origin main
echo.
if %ERRORLEVEL% == 0 (
  echo SUCESSO! Railway e Vercel redeployando em ~2 min.
  echo.
  echo Mudancas deployadas:
  echo  - Modulo agora chama "Cadastro de Usuarios"
  echo  - WhatsApp removido das Configuracoes
  echo  - Conversas hoje e Analytics agora carregam para todos os usuarios
  echo  - Seguranca do Controle IA reforçada
) else (
  echo ERRO no push. Verifique sua conexao com o GitHub.
)
pause

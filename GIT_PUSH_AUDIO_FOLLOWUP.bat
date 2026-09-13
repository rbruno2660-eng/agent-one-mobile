@echo off
title Agent-One — Audio Transcricao + Follow-up Automatico
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
taskkill /F /IM git.exe 2>nul
timeout /t 2 /nobreak >nul
del /f /q .git\HEAD.lock 2>nul
del /f /q .git\index.lock 2>nul

git add backend/src/services/transcription.service.js
git add backend/src/services/followup.service.js
git add backend/src/queues/message.queue.js
git add backend/src/server.js
git add backend/package.json

git commit -m "feat: transcricao de audio (Whisper) + follow-up automatico de leads

Audio (Whisper):
- transcription.service.js: baixa midia do WhatsApp, envia ao Whisper
- message.queue.js: detecta mensagens de audio, transcreve antes de salvar
- Fallback gracioso se OPENAI_API_KEY nao configurada

Follow-up automatico:
- followup.service.js: cron a cada 2h busca leads frios (48h sem resposta)
- Gera mensagem personalizada com Claude Haiku por lead + produto
- Muda stage de 'new' para 'contacted' automaticamente
- Maximo 3 follow-ups por lead (intervalo minimo 72h)
- Novos campos: leads.last_follow_up_at, leads.follow_up_count (migration auto)

Deps: openai ^4.52.0, node-cron ^3.0.3

IMPORTANTE: adicionar OPENAI_API_KEY nas variaveis de ambiente do Railway"

git push origin main
echo.
if %ERRORLEVEL% == 0 (
  echo SUCESSO! Railway redeployando em ~2 min.
  echo.
  echo PROXIMO PASSO OBRIGATORIO:
  echo Adicionar OPENAI_API_KEY nas variaveis do Railway
  echo  Railway ^> seu projeto ^> Variables ^> + New Variable
  echo  OPENAI_API_KEY = sk-...
  echo.
  echo Sem essa chave, audios chegam como [midia] normalmente.
  echo Com a chave, audios sao transcritos automaticamente.
) else (
  echo ERRO no push.
)
pause

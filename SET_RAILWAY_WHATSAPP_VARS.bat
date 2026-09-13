@echo off
:: ============================================================
::  Agent-One — Configurar variáveis WhatsApp no Railway
::  Preencha os 3 valores abaixo após criar o app no Meta
:: ============================================================

:: 1. Token permanente (System User Token ou token do app)
::    Meta Developers → App → WhatsApp → Configuração → Token de acesso
set WHATSAPP_TOKEN=EAAVbXzwMh1cBSYLtkDwsDINOMTeO2Y09nFkOyhuBMT6andTWa1g3nP76WhgwGC0mfhK8ipHcPTZBScC8NTPs3f3lBQZBvBzn3Oswvp3wpxbjOw9BQ7hhAU3jCex6mv0UcBN1S0ZCTPe8xfs6hbZBYOmcvJ7PKlhYFBxMV2WVnAiAGi658HoxLroOKhS7jObcxQZDZD

:: 2. App Secret
::    Meta Developers → App → Configurações → Básico → Segredo do aplicativo
set WHATSAPP_APP_SECRET=90ec94872fdefe4d5a6bd9a4f0a245ac

:: 3. Phone Number ID (aparece após adicionar o número)
::    Meta Developers → App → WhatsApp → Configuração → ID do número de telefone
::    Número de teste: 1248565888344993 (+1 555 672-9262)
::    Número real (5512991913347): preencher após registro na Etapa 2
set WHATSAPP_PHONE_ID=1248565888344993

:: Verify Token — já definido, não precisa mudar
set WHATSAPP_VERIFY_TOKEN=agent-one-webhook-2025

:: ============================================================
echo Configurando variáveis no Railway...

railway variables set WHATSAPP_TOKEN=%WHATSAPP_TOKEN%
railway variables set WHATSAPP_APP_SECRET=%WHATSAPP_APP_SECRET%
railway variables set WHATSAPP_PHONE_ID=%WHATSAPP_PHONE_ID%
railway variables set WHATSAPP_VERIFY_TOKEN=%WHATSAPP_VERIFY_TOKEN%

echo.
echo ✅ Variáveis configuradas! O deploy será redisparado automaticamente.
echo.
echo Próximo passo: configurar webhook no Meta Developers
echo   URL:          https://agent-one-mobile-production.up.railway.app/webhooks/whatsapp
echo   Verify Token: agent-one-webhook-2025
echo   Campos:       messages
echo.
pause

@echo off
cd /d "%~dp0backend"
echo === Registrando numero WhatsApp na Meta Cloud API === > "%~dp0registro_log.txt"
echo. >> "%~dp0registro_log.txt"
node setup_whatsapp_channel.js EAAVbXzwMh1cBSYLtkDwsDINOMTeO2Y09nFkOyhuBMT6andTWa1g3nP76WhgwGC0mfhK8ipHcPTZBScC8NTPs3f3lBQZBvBzn3Oswvp3wpxbjOw9BQ7hhAU3jCex6mv0UcBN1S0ZCTPe8xfs6hbZBYOmcvJ7PKlhYFBxMV2WVnAiAGi658HoxLroOKhS7jObcxQZDZD >> "%~dp0registro_log.txt" 2>&1
echo. >> "%~dp0registro_log.txt"
echo CONCLUIDO em %DATE% %TIME% >> "%~dp0registro_log.txt"
type "%~dp0registro_log.txt"
pause

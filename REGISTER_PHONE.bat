@echo off
cd /d "%~dp0backend"
echo === Agent One - Registrar Numero WhatsApp ===
echo.
echo Conectando ao banco e registrando +55 12 95371-1566...
echo.
node register_phone_now.js
echo.
pause

@echo off
cd /d "%~dp0"
echo Inserindo base de trocas no Agent One...
echo Aguarde... pode demorar 10-20 segundos.
echo.
node INSERIR_TROCAS.js
echo.
pause

@echo off
echo ================================
echo  Agent One - Ambiente de Dev
echo ================================
echo.
echo Iniciando backend na porta 3001...
echo Iniciando frontend na porta 3000...
echo.
echo Acesse: http://localhost:3000
echo Login:  admin@loja.com / Admin@2025
echo.
echo Pressione Ctrl+C para parar.
echo ================================
echo.

:: Roda backend em janela separada
start "Agent One - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Aguarda 3 segundos para o backend inicializar
timeout /t 3 /nobreak > nul

:: Roda frontend nesta janela
cd /d "%~dp0frontend"
npm run dev

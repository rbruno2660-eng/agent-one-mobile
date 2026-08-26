@echo off
echo ================================
echo  Agent One - Configurar Banco
echo ================================
echo.
echo Conectando ao Neon (PostgreSQL)...
echo.

cd /d "%~dp0backend"

echo [1/2] Criando tabelas (migrate)...
node src/db/migrate.js
if errorlevel 1 (
    echo.
    echo ERRO na migration! Verifique o .env
    pause
    exit /b 1
)
echo Tabelas criadas!
echo.

echo [2/2] Inserindo dados iniciais (seed)...
node src/db/seed.js
if errorlevel 1 (
    echo.
    echo ERRO no seed! Mas as tabelas foram criadas.
    pause
    exit /b 1
)
echo Dados inseridos!
echo.

echo ================================
echo  Banco configurado com sucesso!
echo ================================
echo.
echo Agora execute INICIAR_DEV.bat
echo Login: admin@loja.com / Admin@2025
echo.
pause

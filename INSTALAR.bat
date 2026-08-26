@echo off
echo ================================
echo  Agent One Mobile Store - Setup
echo ================================
echo.

echo [1/2] Instalando dependencias do backend...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 (
    echo ERRO ao instalar backend!
    pause
    exit /b 1
)
echo Backend OK!
echo.

echo [2/2] Instalando dependencias do frontend...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo ERRO ao instalar frontend!
    pause
    exit /b 1
)
echo Frontend OK!
echo.

echo ================================
echo  Instalacao concluida!
echo ================================
echo.
echo Proximo passo: configure o arquivo
echo backend\.env com suas credenciais,
echo depois rode INICIAR_DEV.bat
echo.
pause

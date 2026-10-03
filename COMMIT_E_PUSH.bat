@echo off
cd /d "%~dp0"
echo === Agent One - Commit e Push ===
echo.
git config user.email "rbruno2660@gmail.com"
git config user.name "Rafael Bruno"
del /f .git\HEAD.lock 2>nul
del /f .git\index.lock 2>nul
echo Arquivos alterados:
git status --short
echo.
git add backend/src/routes/superadmin.js backend/register_phone_now.js
git commit -m "feat: registrar numero WhatsApp na Cloud API ao ativar tenant"
echo.
echo Fazendo push...
git push origin main
echo.
if %ERRORLEVEL%==0 (
    echo SUCESSO! Deploy no Railway em instantes.
    echo.
    echo Agora rode: node backend/register_phone_now.js
    echo para registrar o numero +55 12 95371-1566
) else (
    echo FALHA no push. Verifique o erro acima.
)
pause

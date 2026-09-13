@echo off
cd /d "%~dp0"
echo Limpando locks do git...
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
echo.
echo Adicionando pagina de Equipe...
git add frontend/src/pages/team/index.js
git commit -m "fix: add /team page (404 fix)"
echo.
echo Enviando para GitHub...
git push origin main
echo.
echo Pronto! Vercel vai fazer novo deploy em ~2 minutos.
pause

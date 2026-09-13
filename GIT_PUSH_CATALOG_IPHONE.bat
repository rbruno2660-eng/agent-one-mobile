@echo off
cd /d "%~dp0"
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
git add frontend/src/pages/catalog/index.js
git add frontend/src/pages/settings/index.js
git commit -m "fix: catalog table scroll on mobile + settings App iPhone tab"
git push origin main
echo.
echo Pronto! Aguarde Vercel reimplantar (1-2 min).
pause

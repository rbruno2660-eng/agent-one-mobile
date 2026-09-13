@echo off
cd /d "%~dp0"
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
git add frontend/src/components/Layout.js
git commit -m "fix: responsive mobile layout - drawer sidebar + top bar for mobile"
git push origin main
echo.
echo Pronto! Vercel reimplanta em 1-2 min.
pause

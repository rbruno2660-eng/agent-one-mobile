@echo off
cd /d "%~dp0"
del /f /q ".git\HEAD.lock" 2>nul
del /f /q ".git\index.lock" 2>nul
git add frontend/src/pages/knowledge/index.js
git commit -m "fix: knowledge cards clickable + categories aligned with DB types"
git push origin main
echo.
echo Pronto! Vercel reimplanta em 1-2 min.
pause

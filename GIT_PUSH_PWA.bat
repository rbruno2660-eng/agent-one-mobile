@echo off
cd /d "%~dp0"
echo Enviando configuracao PWA para GitHub...
git push origin main
echo.
echo Pronto! Vercel vai re-fazer o deploy automaticamente.
echo Aguarde ~2 minutos e acesse:
echo https://agent-one-mobile.vercel.app
pause

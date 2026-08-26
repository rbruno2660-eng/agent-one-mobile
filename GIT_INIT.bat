@echo off
echo Inicializando repositório Git...
cd /d "%~dp0"

:: Remove lock residual do sandbox se existir
if exist ".git\index.lock" del /f ".git\index.lock"

:: Reinicializa (seguro mesmo que já exista)
git init
git branch -M main
git config user.email "rbruno2660@gmail.com"
git config user.name "Rafael Bruno"

:: Adiciona todos os arquivos (respeitando .gitignore)
git add .

echo.
echo Arquivos staged:
git status --short

echo.
echo Fazendo commit inicial...
git commit -m "feat: Agent One Mobile Store - projeto completo (10 sprints)"

echo.
echo ================================
echo  Git pronto! Agora:
echo  1. Va no GitHub e crie o repo
echo  2. Copie o comando "git remote add origin ..."
echo  3. Execute SUBIR_GITHUB.bat
echo ================================
pause

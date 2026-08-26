@echo off
echo ================================
echo  Agent One - Subir para GitHub
echo ================================
cd /d "%~dp0"

:: Remove .git anterior (iniciado pelo sandbox com erros)
if exist ".git" (
    echo Removendo .git anterior com erros...
    rmdir /s /q ".git"
)

:: Inicializa do zero
git init
git branch -M main
git config user.email "rbruno2660@gmail.com"
git config user.name "Rafael Bruno"

:: Adiciona tudo (respeitando .gitignore)
echo Adicionando arquivos...
git add .

echo.
echo Fazendo commit inicial...
git commit -m "feat: Agent One Mobile Store - projeto completo (10 sprints)"

echo.
echo Conectando ao GitHub...
git remote add origin https://github.com/rbruno2660-eng/agent-one-mobile.git

echo.
echo Enviando para o GitHub...
git push -u origin main

echo.
echo ================================
if %errorlevel% == 0 (
    echo  SUBIU COM SUCESSO!
    echo  https://github.com/rbruno2660-eng/agent-one-mobile
) else (
    echo  ERRO ao enviar. Pode ser que precise
    echo  fazer login no GitHub. Uma janela de
    echo  autenticacao pode aparecer - faca login.
)
echo ================================
pause

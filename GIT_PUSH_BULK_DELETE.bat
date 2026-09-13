@echo off
title Agent-One — Git Push Bulk Delete
cd /d C:\Users\rbrun\Desktop\agent-one-mobile
del /f /q .git\index.lock 2>nul
git add backend/src/routes/products.js frontend/src/pages/catalog/index.js frontend/src/pages/trades/index.js frontend/src/pages/services/index.js
git commit -m "feat: bulk select and delete in Catalog, Trades and Services"
git push origin main
echo.
echo Push concluido! Selecao multipla + exclusao em lote para Catalogo, Trocas e Manutencao
pause

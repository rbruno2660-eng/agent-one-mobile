@echo off
echo Testando backend...
cd /d "%~dp0backend"
node src/db/migrate.js > "%~dp0migrate_log.txt" 2>&1
echo Migrate exit code: %errorlevel% >> "%~dp0migrate_log.txt"
node src/db/seed.js >> "%~dp0migrate_log.txt" 2>&1
echo Seed exit code: %errorlevel% >> "%~dp0migrate_log.txt"
echo Teste concluido! Verifique migrate_log.txt
pause

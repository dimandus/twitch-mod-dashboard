@echo off
setlocal

cd /d "%~dp0"

echo === Сборка и упаковка (npm run dist) ===
echo.

npm run dist

echo.
echo === Сборка завершена ===
pause
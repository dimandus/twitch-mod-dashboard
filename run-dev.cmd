@echo off
setlocal

cd /d "%~dp0"

echo === Запуск dev-режима (npm run dev) ===
echo.

npm run dev

echo.
echo === Dev-скрипт завершён ===
pause
@echo off
cd /d "%~dp0"
node build.mjs
echo.
echo Cartella pronta: %~dp0upload
pause

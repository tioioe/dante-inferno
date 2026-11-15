@echo off
cd /d "%~dp0"
start "" http://localhost:8801/editor.html
node server.js

@echo off
rem Abre o site em http://localhost:8770 (feche a janela "Servidor" para parar).
cd /d "%~dp0"
start "Servidor" powershell -NoProfile -ExecutionPolicy Bypass -File ".claude\serve.ps1" -Port 8770
timeout /t 2 /nobreak >nul
start "" http://localhost:8770/

@echo off
start "Sistema Integra" cmd /k "cd /d "%~dp0" && echo Instalando dependencias... && npm install && echo. && echo Iniciando Sistema Integra... && npm run dev"

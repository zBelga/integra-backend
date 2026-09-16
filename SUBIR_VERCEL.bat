@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Sistema Integra - Deploy Frontend na Vercel

echo ==========================================================
echo    SISTEMA INTEGRA - Deploy do Frontend na Vercel
echo ==========================================================
echo.

REM ---------- 1. Cria os arquivos com ponto no nome ----------
echo [1/4] Criando arquivos de configuracao...

(
echo backend/
echo database/
echo scripts/
echo dist-server/
echo *.bat
echo DEPLOY.md
echo railway.json
) > .vercelignore

if exist "RENOMEAR_para_.gitignore.txt" (
    copy /Y "RENOMEAR_para_.gitignore.txt" ".gitignore" >nul
    del "RENOMEAR_para_.gitignore.txt" >nul 2>&1
)
if exist "RENOMEAR_para_.env.example.txt" (
    copy /Y "RENOMEAR_para_.env.example.txt" ".env.example" >nul
    del "RENOMEAR_para_.env.example.txt" >nul 2>&1
)
if exist "RENOMEAR_para_.vercelignore.txt" (
    del "RENOMEAR_para_.vercelignore.txt" >nul 2>&1
)
echo       OK - .vercelignore, .gitignore e .env.example prontos
echo.

REM ---------- 2. Dependencias ----------
echo [2/4] Instalando dependencias (1 a 2 minutos)...
call npm install --no-audit --no-fund
if errorlevel 1 goto erro
echo       OK
echo.

REM ---------- 3. Build de teste ----------
echo [3/4] Testando o build antes de subir...
call npm run build:frontend
if errorlevel 1 goto erro
echo       OK - build gerado sem erros
echo.

REM ---------- 4. Deploy ----------
echo [4/4] Subindo para a Vercel...
echo.
echo   ATENCAO:
echo   - Se for a primeira vez, o navegador vai abrir para login
echo   - Faca login com a conta viralbox2431@gmail.com
echo   - Depois volte aqui, ele continua sozinho
echo.
pause

call npx --yes vercel@latest --prod --yes
if errorlevel 1 goto erro

echo.
echo ==========================================================
echo    PRONTO!
echo.
echo    Copie a URL "Production" que apareceu acima
echo    e cole no chat para eu continuar a configuracao.
echo ==========================================================
echo.
pause
exit /b 0

:erro
echo.
echo ==========================================================
echo    *** DEU ERRO ***
echo    Tire um print ou copie a mensagem acima
echo    e cole no chat que eu resolvo.
echo ==========================================================
echo.
pause
exit /b 1

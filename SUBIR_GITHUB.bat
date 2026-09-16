@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Sistema Integra - Push para o GitHub
setlocal enabledelayedexpansion

echo ==========================================================
echo    SISTEMA INTEGRA - Enviando para o GitHub
echo ==========================================================
echo.

REM ================= 1. PROTECAO DO .ENV =================
echo [1/6] Criando .gitignore (protege suas chaves secretas)...

(
echo # Dependencias
echo node_modules/
echo.
echo # Build
echo build/
echo dist/
echo dist-server/
echo coverage/
echo.
echo # Sistema operacional
echo .DS_Store
echo Thumbs.db
echo.
echo # Logs
echo *.log
echo npm-debug.log*
echo.
echo # VARIAVEIS DE AMBIENTE - NUNCA VERSIONAR
echo .env
echo .env.local
echo .env.production
echo .env*.local
echo.
echo # Banco de dados runtime
echo database/*.sqlite
echo database/*.sqlite-journal
echo database/*.sqlite-shm
echo database/*.sqlite-wal
echo.
echo # TypeScript
echo *.js.map
echo backend/dist/
echo.
echo # Vite
echo frontend/.vite/
echo frontend/dist/
echo.
echo # Deploy
echo .vercel
echo .railway
) > .gitignore

(
echo backend/
echo database/
echo scripts/
echo dist-server/
echo *.bat
echo DEPLOY.md
echo railway.json
) > .vercelignore

if exist "RENOMEAR_para_.env.example.txt" (
    copy /Y "RENOMEAR_para_.env.example.txt" ".env.example" >nul
    del "RENOMEAR_para_.env.example.txt" >nul 2>&1
)
del "RENOMEAR_para_.gitignore.txt" >nul 2>&1
del "RENOMEAR_para_.vercelignore.txt" >nul 2>&1
echo       OK
echo.

REM ================= 2. GIT INIT =================
echo [2/6] Preparando o repositorio local...
if not exist ".git" (
    git init >nul 2>&1
    echo       repositorio criado
) else (
    echo       repositorio ja existia
)
git branch -M main >nul 2>&1
echo.

REM ================= 3. STAGE =================
echo [3/6] Adicionando arquivos...
git add -A
if errorlevel 1 goto erro
echo       OK
echo.

REM ================= 4. TRAVA DE SEGURANCA =================
echo [4/6] VERIFICANDO se o .env vazou...
git diff --cached --name-only > "%TEMP%\si_staged.txt"
findstr /X /C:".env" "%TEMP%\si_staged.txt" >nul
if not errorlevel 1 (
    echo.
    echo ==========================================================
    echo    *** PARADO POR SEGURANCA ***
    echo.
    echo    O arquivo .env entrou no commit. Ele contem a
    echo    SUPABASE_SERVICE_ROLE_KEY e o JWT_SECRET.
    echo.
    echo    Rode este comando e tente de novo:
    echo        git rm --cached .env
    echo ==========================================================
    del "%TEMP%\si_staged.txt" >nul 2>&1
    pause
    exit /b 1
)
del "%TEMP%\si_staged.txt" >nul 2>&1
echo       OK - .env protegido, nao vai subir
echo.

REM ================= 5. COMMIT =================
echo [5/6] Criando o commit...
git -c user.email="viralbox2431@gmail.com" -c user.name="Fabricio Oliveira" commit -m "Sistema Integra - modulo de documentos + preparacao de deploy" >nul 2>&1
if errorlevel 1 (
    echo       nada novo para commitar ^(ja estava atualizado^)
) else (
    echo       OK
)
echo.

REM ================= 6. PUSH =================
echo [6/6] Enviando para os dois repositorios...
echo.
echo   Se pedir login, use sua conta zBelga do GitHub.
echo.

git remote remove frontend >nul 2>&1
git remote remove backend  >nul 2>&1
git remote remove origin   >nul 2>&1
git remote add origin   https://github.com/zBelga/integra-frontend.git
git remote add backend  https://github.com/zBelga/integra-backend.git

echo   --^> integra-frontend ...
git push -u origin main
if errorlevel 1 goto erro_push

echo.
echo   --^> integra-backend ...
git push backend main
if errorlevel 1 goto erro_push

echo.
echo ==========================================================
echo    PRONTO! Os dois repositorios estao no ar.
echo.
echo    Volte no chat e escreva "subi" que eu assumo daqui:
echo    crio o projeto na Vercel e no Railway, configuro as
echo    variaveis e valido tudo.
echo ==========================================================
echo.
pause
exit /b 0

:erro_push
echo.
echo ==========================================================
echo    *** ERRO NO PUSH ***
echo.
echo    Causas comuns:
echo    - Login do GitHub cancelado ou errado
echo    - O repositorio nao esta vazio (tem README)
echo      Nesse caso rode:  git push -f origin main
echo.
echo    Copie a mensagem acima e cole no chat.
echo ==========================================================
echo.
pause
exit /b 1

:erro
echo.
echo *** ERRO - copie a mensagem acima e cole no chat ***
pause
exit /b 1

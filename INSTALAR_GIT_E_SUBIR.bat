@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Sistema Integra - Instalar Git e Subir
setlocal enabledelayedexpansion

echo ==========================================================
echo    SISTEMA INTEGRA - Instalar Git e enviar ao GitHub
echo ==========================================================
echo.

REM ============ 1. LOCALIZAR O GIT ============
echo [1/7] Procurando o Git...
set "GIT="

where git >nul 2>&1
if not errorlevel 1 (
    set "GIT=git"
    echo       encontrado no PATH
    goto git_ok
)

if exist "%ProgramFiles%\Git\cmd\git.exe"      set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" set "GIT=%ProgramFiles(x86)%\Git\cmd\git.exe"
if exist "%LocalAppData%\Programs\Git\cmd\git.exe" set "GIT=%LocalAppData%\Programs\Git\cmd\git.exe"

if not "!GIT!"=="" (
    echo       encontrado em: !GIT!
    goto git_ok
)

echo       Git NAO encontrado. Instalando...
echo.
where winget >nul 2>&1
if errorlevel 1 (
    echo ==========================================================
    echo    O winget nao existe nesta maquina.
    echo.
    echo    Baixe e instale o Git manualmente:
    echo        https://git-scm.com/download/win
    echo.
    echo    Aceite todas as opcoes padrao. Depois rode
    echo    este arquivo novamente.
    echo ==========================================================
    start "" "https://git-scm.com/download/win"
    pause
    exit /b 1
)

echo   Instalando via winget (aceite o prompt se aparecer)...
winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
echo.
echo   Verificando a instalacao...

if exist "%ProgramFiles%\Git\cmd\git.exe"      set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if exist "%ProgramFiles(x86)%\Git\cmd\git.exe" set "GIT=%ProgramFiles(x86)%\Git\cmd\git.exe"
if exist "%LocalAppData%\Programs\Git\cmd\git.exe" set "GIT=%LocalAppData%\Programs\Git\cmd\git.exe"

if "!GIT!"=="" (
    echo.
    echo ==========================================================
    echo    O Git foi instalado mas nao localizei o executavel.
    echo    FECHE esta janela e rode este arquivo de novo
    echo    ^(o Windows precisa recarregar o PATH^).
    echo ==========================================================
    pause
    exit /b 1
)
echo       instalado: !GIT!

:git_ok
echo.
"!GIT!" --version
echo.

REM ============ 2. IDENTIDADE ============
echo [2/7] Configurando identidade do commit...
"!GIT!" config --global user.email "fabriciooliveira2431@gmail.com" >nul 2>&1
"!GIT!" config --global user.name "Fabricio Oliveira" >nul 2>&1
"!GIT!" config --global init.defaultBranch main >nul 2>&1
echo       OK
echo.

REM ============ 3. INIT ============
echo [3/7] Criando o repositorio local...
if exist ".git" (
    echo       ja existia
) else (
    "!GIT!" init
    if errorlevel 1 goto erro
    echo       criado
)
"!GIT!" branch -M main
echo.

REM ============ 4. ADD ============
echo [4/7] Adicionando arquivos...
"!GIT!" add -A
if errorlevel 1 goto erro
echo       OK
echo.

REM ============ 5. TRAVA DE SEGURANCA DO .ENV ============
echo [5/7] Verificando se o .env vazou para o commit...
"!GIT!" diff --cached --name-only > "%TEMP%\si_staged.txt" 2>&1
findstr /X /C:".env" "%TEMP%\si_staged.txt" >nul
if not errorlevel 1 (
    echo.
    echo ==========================================================
    echo    *** PARADO POR SEGURANCA ***
    echo    O .env entrou no commit. Ele tem a chave secreta
    echo    do Supabase e o JWT_SECRET.
    echo.
    echo    Rode:   git rm --cached .env
    echo    e execute este arquivo novamente.
    echo ==========================================================
    del "%TEMP%\si_staged.txt" >nul 2>&1
    pause
    exit /b 1
)
del "%TEMP%\si_staged.txt" >nul 2>&1
echo       OK - .env protegido
echo.

REM ============ 6. COMMIT ============
echo [6/7] Criando o commit...
"!GIT!" commit -m "Sistema Integra - modulo de documentos + deploy" >nul 2>&1
if errorlevel 1 (
    echo       nada novo ^(ja estava commitado^)
) else (
    echo       OK
)
echo.

REM ============ 7. PUSH ============
echo [7/7] Enviando para o GitHub...
echo.
echo   Vai abrir uma janela de login do GitHub.
echo   Entre com a conta zBelga.
echo.

"!GIT!" remote remove origin  >nul 2>&1
"!GIT!" remote remove backend >nul 2>&1
"!GIT!" remote add origin  https://github.com/zBelga/integra-frontend.git
"!GIT!" remote add backend https://github.com/zBelga/integra-backend.git

echo   --^> integra-frontend
"!GIT!" push -u origin main
if errorlevel 1 goto erro_push

echo.
echo   --^> integra-backend
"!GIT!" push backend main
if errorlevel 1 goto erro_push

echo.
echo ==========================================================
echo    PRONTO! Os dois repositorios estao no ar.
echo.
echo    Volte no chat e escreva: subiu
echo ==========================================================
echo.
pause
exit /b 0

:erro_push
echo.
echo ==========================================================
echo    *** ERRO NO PUSH ***
echo    Se falou em "rejected" ou "non-fast-forward", rode:
echo        git push -f origin main
echo        git push -f backend main
echo.
echo    Copie a mensagem acima e cole no chat.
echo ==========================================================
pause
exit /b 1

:erro
echo.
echo *** ERRO - copie a mensagem acima e cole no chat ***
pause
exit /b 1

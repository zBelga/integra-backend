@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Sistema Integra - Publicar alteracoes
setlocal enabledelayedexpansion

echo ==========================================================
echo    PUBLICAR ALTERACOES
echo    Correcao: colaboradores sumindo da lista
echo ==========================================================
echo.

REM ---------- localizar o git ----------
set "GIT="
where git >nul 2>&1 && set "GIT=git"
if "!GIT!"=="" if exist "%ProgramFiles%\Git\cmd\git.exe" set "GIT=%ProgramFiles%\Git\cmd\git.exe"
if "!GIT!"=="" if exist "%LocalAppData%\Programs\Git\cmd\git.exe" set "GIT=%LocalAppData%\Programs\Git\cmd\git.exe"
if "!GIT!"=="" (
    echo *** Git nao encontrado. Rode INSTALAR_GIT_E_SUBIR.bat primeiro. ***
    pause
    exit /b 1
)

echo [1/4] Adicionando arquivos...
"!GIT!" add -A
if errorlevel 1 goto erro
echo       OK
echo.

echo [2/4] Verificando se o .env vazou...
"!GIT!" diff --cached --name-only > "%TEMP%\si_chk.txt" 2>&1
findstr /X /C:".env" "%TEMP%\si_chk.txt" >nul
if not errorlevel 1 (
    echo.
    echo    *** PARADO: o .env entrou no commit. ***
    echo    Rode:  git rm --cached .env
    del "%TEMP%\si_chk.txt" >nul 2>&1
    pause
    exit /b 1
)
del "%TEMP%\si_chk.txt" >nul 2>&1
echo       OK - .env protegido
echo.

echo [3/4] Commit...
"!GIT!" commit -m "fix: LEFT JOIN em obras, limite 500 e endpoint /documentos/resumo" >nul 2>&1
if errorlevel 1 (
    echo       nada novo para commitar
) else (
    echo       OK
)
echo.

echo [4/4] Enviando...
echo   --^> integra-frontend (Vercel)
"!GIT!" push origin main
if errorlevel 1 goto erro_push
echo.
echo   --^> integra-backend (Railway)
"!GIT!" push backend main
if errorlevel 1 goto erro_push

echo.
echo ==========================================================
echo    ENVIADO! Vercel e Railway ja estao buildando.
echo    Volte no chat e escreva: publiquei
echo ==========================================================
echo.
pause
exit /b 0

:erro_push
echo.
echo *** ERRO NO PUSH - copie a mensagem acima e cole no chat ***
pause
exit /b 1

:erro
echo.
echo *** ERRO - copie a mensagem acima e cole no chat ***
pause
exit /b 1

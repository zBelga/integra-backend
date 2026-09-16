@echo off
chcp 65001 >nul
cd /d "%~dp0"
set OUT=DIAGNOSTICO.txt

echo Coletando diagnostico... aguarde.

> "%OUT%" echo ===== DIAGNOSTICO SISTEMA INTEGRA =====
>> "%OUT%" echo Data: %DATE% %TIME%
>> "%OUT%" echo Pasta: %CD%
>> "%OUT%" echo.

>> "%OUT%" echo --- GIT INSTALADO? ---
>> "%OUT%" 2>&1 git --version
>> "%OUT%" echo errorlevel=%errorlevel%
>> "%OUT%" echo.

>> "%OUT%" echo --- NODE / NPM ---
>> "%OUT%" 2>&1 node --version
>> "%OUT%" 2>&1 npm --version
>> "%OUT%" echo.

>> "%OUT%" echo --- EXISTE PASTA .git? ---
if exist ".git" (>> "%OUT%" echo SIM) else (>> "%OUT%" echo NAO)
>> "%OUT%" echo.

>> "%OUT%" echo --- BRANCH ATUAL ---
>> "%OUT%" 2>&1 git branch --show-current
>> "%OUT%" echo.

>> "%OUT%" echo --- TODAS AS BRANCHES ---
>> "%OUT%" 2>&1 git branch -a
>> "%OUT%" echo.

>> "%OUT%" echo --- REMOTES ---
>> "%OUT%" 2>&1 git remote -v
>> "%OUT%" echo.

>> "%OUT%" echo --- COMMITS (ultimos 5) ---
>> "%OUT%" 2>&1 git log --oneline -5
>> "%OUT%" echo.

>> "%OUT%" echo --- STATUS RESUMIDO ---
>> "%OUT%" 2>&1 git status --short
>> "%OUT%" echo.

>> "%OUT%" echo --- QUANTOS ARQUIVOS RASTREADOS ---
>> "%OUT%" 2>&1 git ls-files
>> "%OUT%" echo.

>> "%OUT%" echo --- O .env ESTA RASTREADO? (se aparecer algo, e PROBLEMA) ---
>> "%OUT%" 2>&1 git ls-files .env
>> "%OUT%" echo.

>> "%OUT%" echo --- ARQUIVOS NA RAIZ ---
>> "%OUT%" 2>&1 dir /b
>> "%OUT%" echo.

>> "%OUT%" echo --- TESTE DE CONEXAO COM O GITHUB ---
>> "%OUT%" 2>&1 git ls-remote https://github.com/zBelga/integra-frontend.git
>> "%OUT%" echo errorlevel=%errorlevel%
>> "%OUT%" echo.

>> "%OUT%" echo ===== FIM =====

echo.
echo ==========================================================
echo    Pronto! Criei o arquivo DIAGNOSTICO.txt
echo    Volte no chat e escreva "diagnostico pronto"
echo    que eu leio o arquivo daqui.
echo ==========================================================
echo.
pause

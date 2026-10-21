@echo off
setlocal
set ELECTRON_RUN_AS_NODE=
set ELECTRON_ENABLE_LOGGING=1
cd /d "%~dp0\.."
echo [Launcher] Compilando backend Electron...
call npm run build:electron
if %ERRORLEVEL% NEQ 0 (
  echo [Launcher] Erro ao compilar backend Electron.
  pause
  exit /b %ERRORLEVEL%
)
echo [Launcher] Iniciando Workspace Fiscal...
"%~dp0..\node_modules\electron\dist\electron.exe" "%~dp0..\dist-electron\main.cjs"

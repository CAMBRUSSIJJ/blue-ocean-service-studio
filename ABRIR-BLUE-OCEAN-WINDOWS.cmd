@echo off
setlocal EnableExtensions
title Blue Ocean Service Studio H2 - Windows
cd /d "%~dp0"
echo.
echo Blue Ocean Service Studio - Inicializacao Windows
echo Pasta: %CD%
echo.
if not exist "package.json" (
  echo ERRO: o arquivo package.json nao esta nesta pasta.
  echo Extraia o ZIP completo e execute este CMD na pasta do projeto.
  pause
  exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. Instale Node.js 22 em https://nodejs.org/
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo ERRO: npm nao encontrado. Reinstale Node.js 22.
  pause
  exit /b 1
)
node --version
npm.cmd --version
if not exist "node_modules\.bin\vite.cmd" (
  echo.
  echo Instalando dependencias pela primeira vez...
  call npm.cmd ci
  if errorlevel 1 (
    echo ERRO: npm ci falhou. Verifique as mensagens acima.
    pause
    exit /b 1
  )
)
set "BO_PORT=5173"
for /f %%P in ('powershell -NoProfile -Command "$p=5173; while (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) {$p++}; $p"') do set "BO_PORT=%%P"
echo.
echo Iniciando Blue Ocean na porta %BO_PORT%...
echo O navegador sera aberto apenas quando o servidor estiver respondendo.
echo Deixe esta janela aberta durante o uso.
start "" /min powershell -NoProfile -Command "$url='http://127.0.0.1:%BO_PORT%/'; for($i=0;$i -lt 120;$i++){try{$r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri $url; if($r.StatusCode -eq 200){Start-Process $url;break}}catch{};Start-Sleep -Milliseconds 700}"
call npm.cmd run dev -- --host 127.0.0.1 --port %BO_PORT% --strictPort
echo.
echo O Blue Ocean foi encerrado ou nao conseguiu iniciar.
echo Revise o erro acima. Nenhum dado local foi apagado.
pause
endlocal

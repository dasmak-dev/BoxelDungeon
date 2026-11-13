@echo off
setlocal
title Boxel Dungeon - servidor cooperativo
cd /d "%~dp0"

rem ---------------------------------------------------------------
rem  Arranca el servidor de salas para jugar en red local.
rem  Si Node.js no esta instalado, descarga una copia portable
rem  (solo la primera vez) en la carpeta server\node.
rem ---------------------------------------------------------------

set "NODE=node"
where node >nul 2>nul
if %errorlevel%==0 goto run

set "NODE=%~dp0server\node\node.exe"
if exist "%NODE%" goto run

echo Node.js no esta instalado. Descargando una copia portable (unos 30 MB, solo la primera vez)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;" ^
  "$base='https://nodejs.org/dist/latest-v22.x/';" ^
  "$sums=(Invoke-WebRequest -UseBasicParsing ($base+'SHASUMS256.txt')).Content;" ^
  "$name=([regex]::Match($sums,'node-v[\d\.]+-win-x64\.zip')).Value;" ^
  "if(-not $name){throw 'No se encontro la version de Node'};" ^
  "$tmp=Join-Path $env:TEMP $name;" ^
  "Invoke-WebRequest -UseBasicParsing ($base+$name) -OutFile $tmp;" ^
  "$dst=Join-Path $env:TEMP 'boxel-node';" ^
  "if(Test-Path $dst){Remove-Item $dst -Recurse -Force};" ^
  "Expand-Archive $tmp -DestinationPath $dst -Force;" ^
  "$dir=Get-ChildItem $dst | Select-Object -First 1;" ^
  "New-Item -ItemType Directory -Force 'server\node' | Out-Null;" ^
  "Copy-Item (Join-Path $dir.FullName 'node.exe') 'server\node\node.exe';" ^
  "Remove-Item $tmp,$dst -Recurse -Force"
if not exist "%NODE%" (
  echo.
  echo No se pudo descargar Node.js. Instalalo desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)

:run
echo.
echo  Servidor de Boxel Dungeon
echo  - En este ordenador:  http://localhost:8080
echo  - Los demas: la direccion http://192.168.x.x:8080 que aparece abajo
echo  - Si Windows pregunta por el firewall, permite el acceso en "Redes privadas".
echo  - Cierra esta ventana para apagar el servidor.
echo.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8080"
"%NODE%" server\server.js
echo.
echo El servidor se ha detenido.
pause

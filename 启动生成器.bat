@echo off
chcp 65001 >nul 2>nul
title RANDOM GEN - local server
cd /d "%~dp0"

rem ---- find node.exe ----
set "NODE="
where node >nul 2>nul
if %errorlevel%==0 set "NODE=node"
if not defined NODE if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" set "NODE=%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-6\node.exe"
if not defined NODE if exist "C://Program Files//nodejs//node.exe" set "NODE=C://Program Files\nodejs\node.exe"

if not defined NODE goto nonode

echo Starting server... (Ctrl+C to stop)
"%NODE%" server.js
goto end

:nonode
echo.
echo [!] Node.js was not found on this machine.
echo.
echo     Option A - just double-click index.html (no server needed).
echo               Everything works; only "write store back to file"
echo               needs one click in the Storage panel.
echo.
echo     Option B - install Node.js from https://nodejs.org then run me again.
echo.
pause
exit /b 1

:end
pause

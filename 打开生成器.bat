@echo off
rem ------------------------------------------------------------------
rem  Double-click this file to open the generator.
rem  No install, no server needed -- it just opens the local HTML file.
rem  Prefers Chrome / Edge so a wrong .html file association (e.g. an
rem  editor) cannot get in the way.
rem ------------------------------------------------------------------
setlocal
set "F=%~dp0index.html"
set "PF86=%ProgramFiles(x86)%"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%F%"
  exit /b
)
if exist "%PF86%\Google\Chrome\Application\chrome.exe" (
  start "" "%PF86%\Google\Chrome\Application\chrome.exe" "%F%"
  exit /b
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%F%"
  exit /b
)
if exist "%PF86%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%PF86%\Microsoft\Edge\Application\msedge.exe" "%F%"
  exit /b
)

rem fallback: hand it to whatever .html is associated with
start "" "%F%"
exit /b

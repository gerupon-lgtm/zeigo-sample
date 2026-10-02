@echo off
cd /d "%~dp0"
if not exist "node_modules\vite" (
  call npm.cmd install --cache .npm-cache
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm.cmd run dev -- --open
pause

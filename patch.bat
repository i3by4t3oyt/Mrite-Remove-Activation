@echo off
setlocal
title Mrite Patch

cd /d "%~dp0"

echo.
echo  ========================================
echo    Mrite v2.1 - Remove Activation
echo  ========================================
echo.

set "RES_DIR="

if exist "win-unpacked\resources\app.asar" set "RES_DIR=win-unpacked\resources"
if exist "resources\app.asar" set "RES_DIR=resources"
if exist "app.asar" set "RES_DIR=."

if "%RES_DIR%"=="" (
    echo  [ERROR] Cannot find app.asar
    echo.
    echo  Put this file next to win-unpacked folder, or inside resources folder.
    echo.
    pause
    exit /b 1
)

echo  [OK] Found: %RES_DIR%\app.asar
echo.

tasklist /FI "IMAGENAME eq Mrite.exe" 2>nul | find /i "Mrite.exe" >nul
if not errorlevel 1 (
    echo  [!] Closing Mrite...
    taskkill /F /IM Mrite.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo  [OK] Closed
    echo.
)

where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found
    echo  Please install from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo  [OK] Node.js ready
echo.

if not exist "patch.js" (
    echo  [ERROR] patch.js not found
    echo  Make sure patch.js is in the same folder as this file.
    echo.
    pause
    exit /b 1
)

echo  [*] Running patch (1-2 minutes, please wait)...
echo.

node "patch.js" "%RES_DIR%"

if errorlevel 1 (
    echo.
    echo  [ERROR] Patch failed. See error above.
    echo.
    pause
    exit /b 1
)

echo.
echo  ========================================
echo    Done! Launch Mrite.exe to verify.
echo    Restore: rename app_original.asar to app.asar
echo  ========================================
echo.
pause

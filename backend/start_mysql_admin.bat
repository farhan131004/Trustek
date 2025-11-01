@echo off
echo ========================================
echo   Starting MySQL Service (Admin Required)
echo ========================================
echo.
echo This script requires Administrator privileges.
echo If you see "Access is denied", right-click and select
echo "Run as Administrator"
echo.

REM Check if already admin
net session >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Running with Administrator privileges
    goto :start_mysql
) else (
    echo [ERROR] This script needs Administrator privileges!
    echo.
    echo Please:
    echo   1. Right-click this file
    echo   2. Select "Run as Administrator"
    echo.
    echo OR run in PowerShell as Admin:
    echo   Start-Process PowerShell -Verb RunAs
    echo   net start MySQL95
    pause
    exit /b 1
)

:start_mysql
echo.
echo Attempting to start MySQL95...
net start MySQL95
if %errorlevel% == 0 (
    echo [OK] MySQL95 service started successfully!
) else (
    echo [ERROR] Failed to start MySQL95
    echo.
    echo Checking for other MySQL service names...
    sc query state= all | findstr /i "mysql" | findstr /i "SERVICE_NAME"
    echo.
    echo Common MySQL service names:
    echo   - MySQL95
    echo   - MySQL80
    echo   - MySQL
    echo   - MySQL57
    echo.
    echo Try: net start MySQL80
    echo OR: net start MySQL
)

echo.
echo Creating database...
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>nul
if %errorlevel% == 0 (
    echo [OK] Database trustek_db created/verified
) else (
    echo [WARNING] Could not create database automatically
    echo Please create manually: CREATE DATABASE trustek_db;
)

echo.
pause



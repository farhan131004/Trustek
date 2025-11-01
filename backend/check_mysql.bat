@echo off
echo ========================================
echo   MySQL Connection Check for Trustek
echo ========================================
echo.

echo Checking if MySQL service is running...
sc query MySQL80 | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo [OK] MySQL80 service is running
) else (
    echo [ERROR] MySQL80 service is NOT running
    echo.
    echo Attempting to start MySQL service...
    net start MySQL80
    if %errorlevel% == 0 (
        echo [OK] MySQL service started successfully
    ) else (
        echo [ERROR] Could not start MySQL service automatically
        echo Please start it manually or check if MySQL is installed
        pause
        exit /b 1
    )
)

echo.
echo Testing MySQL connection...
mysql -u root -proot -e "SELECT 1;" >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] MySQL connection successful
) else (
    echo [WARNING] MySQL connection failed with default credentials
    echo Please verify your MySQL root password
    echo.
    echo Testing without password...
    mysql -u root -e "SELECT 1;" >nul 2>&1
    if %errorlevel% == 0 (
        echo [OK] MySQL connection works without password
        echo [INFO] Update application.properties: spring.datasource.password=
    ) else (
        echo [ERROR] Cannot connect to MySQL
        echo Please check:
        echo   1. MySQL is installed and running
        echo   2. Root password is correct
        pause
        exit /b 1
    )
)

echo.
echo Creating database if it doesn't exist...
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>nul
if %errorlevel% == 0 (
    echo [OK] Database trustek_db is ready
) else (
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>nul
    if %errorlevel% == 0 (
        echo [OK] Database trustek_db is ready
    ) else (
        echo [WARNING] Could not create database automatically
        echo Please create it manually: CREATE DATABASE trustek_db;
    )
)

echo.
echo ========================================
echo   MySQL is ready for Trustek Backend!
echo ========================================
echo.
pause



@echo off
echo ========================================
echo   TRUSTEK - START ALL SERVICES
echo ========================================
echo.

echo [Step 1/3] Starting ML Service...
start "ML Service" cmd /k "cd ml-service && python app.py"
timeout /t 3 >nul

echo [Step 2/3] Starting Backend...
start "Backend" cmd /k "cd backend && mvn spring-boot:run"
timeout /t 5 >nul

echo [Step 3/3] Starting Frontend...
start "Frontend" cmd /k "cd trustek-app--master && npm run dev"

echo.
echo ========================================
echo   All services starting!
echo   - ML Service: http://localhost:8000
echo   - Backend: http://localhost:5000
echo   - Frontend: http://localhost:5173
echo ========================================
echo.
echo NOTE: Make sure MySQL is running and database 'trustek_db' exists!
echo       Configure password in backend/src/main/resources/application.properties
echo.
pause


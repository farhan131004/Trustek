# Trustek Services Startup Script for PowerShell
# Run this script to start all services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TRUSTEK - START ALL SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "ml-service")) {
    Write-Host "❌ Error: ml-service directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the Trustek root directory." -ForegroundColor Yellow
    exit 1
}

# Step 1: Start Flask Service
Write-Host "[Step 1/3] Starting ML Service (Flask)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\ml-service'; if (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; python app.py" -WindowStyle Normal
Start-Sleep -Seconds 3

# Step 2: Start Spring Boot Backend
Write-Host "[Step 2/3] Starting Backend (Spring Boot)..." -ForegroundColor Yellow

# Check if JAR exists
if (Test-Path "backend\target\backend-1.0.0.jar") {
    Write-Host "   Using pre-built JAR file..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; java -jar target\backend-1.0.0.jar" -WindowStyle Normal
} else {
    # Try Maven
    $mavenCheck = Get-Command mvn -ErrorAction SilentlyContinue
    if ($mavenCheck) {
        Write-Host "   Using Maven..." -ForegroundColor Gray
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; mvn spring-boot:run" -WindowStyle Normal
    } else {
        Write-Host "   ⚠️  No JAR file found and Maven not installed!" -ForegroundColor Yellow
        Write-Host "   Please build the project first or install Maven." -ForegroundColor Yellow
    }
}
Start-Sleep -Seconds 5

# Step 3: Start Frontend
Write-Host "[Step 3/3] Starting Frontend (React)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\trustek-app--master'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  - ML Service (Flask):     http://localhost:5000" -ForegroundColor White
Write-Host "  - Backend (Spring Boot):  http://localhost:8081" -ForegroundColor White
Write-Host "  - Frontend (React):       http://localhost:8080 or http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Make sure MySQL is running and database 'trustek_db' exists!" -ForegroundColor Yellow
Write-Host "      Configure password in backend/src/main/resources/application.properties" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


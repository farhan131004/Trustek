# MySQL Connection Test Script for PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MySQL Connection Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check MySQL service
Write-Host "[1/4] Checking MySQL Service..." -ForegroundColor Yellow
$mysqlService = Get-Service | Where-Object {$_.DisplayName -like "*MySQL*"} | Select-Object -First 1

if ($mysqlService) {
    Write-Host "✅ MySQL Service Found: $($mysqlService.DisplayName)" -ForegroundColor Green
    Write-Host "   Status: $($mysqlService.Status)" -ForegroundColor $(if ($mysqlService.Status -eq 'Running') { 'Green' } else { 'Red' })
    
    if ($mysqlService.Status -ne 'Running') {
        Write-Host "   Attempting to start MySQL..." -ForegroundColor Yellow
        try {
            Start-Service $mysqlService.Name -ErrorAction Stop
            Start-Sleep -Seconds 3
            Write-Host "   ✅ MySQL started successfully" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Failed to start MySQL. Run PowerShell as Administrator." -ForegroundColor Red
            Write-Host "   Or start manually: Start-Service $($mysqlService.Name)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ MySQL service not found!" -ForegroundColor Red
    Write-Host "   Please install MySQL Server" -ForegroundColor Yellow
    Write-Host "   Download: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Gray
    exit 1
}

# Test port
Write-Host "`n[2/4] Testing Port 3306..." -ForegroundColor Yellow
try {
    $portTest = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue -InformationLevel Quiet
    
    if ($portTest) {
        Write-Host "✅ Port 3306 is open" -ForegroundColor Green
    } else {
        Write-Host "❌ Port 3306 is closed" -ForegroundColor Red
        Write-Host "   MySQL may not be listening on port 3306" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not test port (may require admin)" -ForegroundColor Yellow
}

# Test MySQL connection
Write-Host "`n[3/4] Testing MySQL Connection..." -ForegroundColor Yellow

# Try to read password from application.properties
$appPropsPath = "backend\src\main\resources\application.properties"
$password = "root"  # default

if (Test-Path $appPropsPath) {
    $propsContent = Get-Content $appPropsPath
    $passwordLine = $propsContent | Where-Object { $_ -match "spring.datasource.password=(.+)" }
    if ($passwordLine) {
        $password = ($passwordLine -split "=")[1].Trim()
    }
}

Write-Host "   Using password from application.properties..." -ForegroundColor Gray

try {
    # Test connection
    $result = mysql -u root -p$password -e "SELECT 'Connection OK' AS Status;" 2>&1
    
    if ($LASTEXITCODE -eq 0 -or $result -match "Connection OK") {
        Write-Host "✅ MySQL connection successful!" -ForegroundColor Green
        
        # Check database
        Write-Host "`n[4/4] Checking Database..." -ForegroundColor Yellow
        $dbCheck = mysql -u root -p$password -e "SHOW DATABASES LIKE 'trustek_db';" 2>&1
        
        if ($dbCheck -match "trustek_db") {
            Write-Host "✅ Database 'trustek_db' exists" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Database 'trustek_db' not found" -ForegroundColor Yellow
            Write-Host "   Creating database..." -ForegroundColor Gray
            mysql -u root -p$password -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Database 'trustek_db' created successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to create database" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ MySQL connection failed!" -ForegroundColor Red
        Write-Host "   Error: $result" -ForegroundColor Red
        Write-Host "`n   Possible issues:" -ForegroundColor Yellow
        Write-Host "   - Wrong password (check application.properties)" -ForegroundColor Yellow
        Write-Host "   - MySQL not accessible" -ForegroundColor Yellow
        Write-Host "   - MySQL client not in PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Could not test MySQL connection" -ForegroundColor Red
    Write-Host "   Make sure MySQL client is installed and in PATH" -ForegroundColor Yellow
    Write-Host "   Or install MySQL Shell from: https://dev.mysql.com/downloads/shell/" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If MySQL is running and database exists, start Spring Boot:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   java -jar target\backend-1.0.0.jar --server.port=8081" -ForegroundColor Gray
Write-Host ""
Write-Host "2. If you still get errors, check:" -ForegroundColor White
Write-Host "   - MySQL service is running (services.msc)" -ForegroundColor Gray
Write-Host "   - Password in application.properties matches MySQL password" -ForegroundColor Gray
Write-Host "   - Database 'trustek_db' exists" -ForegroundColor Gray
Write-Host ""


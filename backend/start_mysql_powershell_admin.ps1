# PowerShell script to start MySQL (Run as Administrator)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MySQL Service (Admin Required)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script needs Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator:" -ForegroundColor Yellow
    Write-Host "  1. Press Windows key"
    Write-Host "  2. Type: PowerShell"
    Write-Host "  3. Right-click 'Windows PowerShell'"
    Write-Host "  4. Select 'Run as Administrator'"
    Write-Host "  5. Navigate to backend folder: cd 'C:\Users\Farha\OneDrive\Desktop\trustek\backend'"
    Write-Host "  6. Run: .\start_mysql_powershell_admin.ps1"
    Write-Host ""
    Write-Host "OR use this command:" -ForegroundColor Yellow
    Write-Host "  Start-Process powershell -Verb RunAs -ArgumentList '-NoExit', '-Command', 'cd C:\Users\Farha\OneDrive\Desktop\trustek\backend; .\start_mysql_powershell_admin.ps1'"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Try to find MySQL service
$mysqlServices = @("MySQL95", "MySQL80", "MySQL", "MySQL57", "MySQLServer")

$started = $false
foreach ($serviceName in $mysqlServices) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "Found MySQL service: $serviceName" -ForegroundColor Yellow
        
        if ($service.Status -eq 'Running') {
            Write-Host "[OK] MySQL service '$serviceName' is already running" -ForegroundColor Green
            $started = $true
            break
        } else {
            Write-Host "Starting MySQL service: $serviceName..." -ForegroundColor Yellow
            try {
                Start-Service -Name $serviceName
                Write-Host "[OK] MySQL service '$serviceName' started successfully!" -ForegroundColor Green
                $started = $true
                break
            } catch {
                Write-Host "[ERROR] Failed to start $serviceName : $_" -ForegroundColor Red
            }
        }
    }
}

if (-not $started) {
    Write-Host ""
    Write-Host "[ERROR] Could not find or start MySQL service" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available services:" -ForegroundColor Yellow
    Get-Service | Where-Object {$_.DisplayName -like "*MySQL*" -or $_.Name -like "*MySQL*"} | Format-Table Name, DisplayName, Status
    
    Write-Host ""
    Write-Host "Please start MySQL manually:" -ForegroundColor Yellow
    Write-Host "  1. Open Services (services.msc)"
    Write-Host "  2. Find MySQL service"
    Write-Host "  3. Right-click > Start"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Wait a moment for MySQL to fully start
Start-Sleep -Seconds 2

# Create database
Write-Host ""
Write-Host "Creating database trustek_db..." -ForegroundColor Yellow
try {
    $result = mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Database trustek_db created/verified" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Could not create database automatically" -ForegroundColor Yellow
        Write-Host "Please create manually:" -ForegroundColor Yellow
        Write-Host "  mysql -u root -p"
        Write-Host "  CREATE DATABASE trustek_db;"
    }
} catch {
    Write-Host "[WARNING] Could not verify database creation" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MySQL is ready for Trustek Backend!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start the backend:" -ForegroundColor Yellow
Write-Host "  cd backend"
Write-Host "  mvn spring-boot:run"
Write-Host ""
Read-Host "Press Enter to exit"



# Quick Start MySQL - Fix "Access Denied" Error

## Problem
```
System error 5 has occurred.
Access is denied.
```

This happens because starting MySQL service requires **Administrator privileges**.

## ✅ Solution: Run as Administrator

### Method 1: PowerShell as Admin (Recommended)

1. **Open PowerShell as Administrator:**
   - Press `Windows Key`
   - Type: `PowerShell`
   - **Right-click** "Windows PowerShell"
   - Select **"Run as Administrator"**

2. **Run the setup script:**
   ```powershell
   cd C:\Users\Farha\OneDrive\Desktop\trustek\backend
   .\start_mysql_powershell_admin.ps1
   ```

### Method 2: Start MySQL Manually

1. **Open PowerShell as Administrator** (as above)

2. **Start MySQL service:**
   ```powershell
   # Try one of these service names:
   net start MySQL95
   # OR
   net start MySQL80
   # OR
   net start MySQL
   ```

3. **Create database:**
   ```powershell
   mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;"
   ```

### Method 3: Use Services GUI

1. **Open Services:**
   - Press `Windows Key + R`
   - Type: `services.msc`
   - Press Enter

2. **Find MySQL Service:**
   - Look for services like:
     - MySQL95
     - MySQL80
     - MySQL
     - MySQL Server

3. **Start the Service:**
   - Right-click on MySQL service
   - Select **"Start"**
   - Or right-click > Properties > Start

### Method 4: Command Prompt as Admin

1. **Open Command Prompt as Administrator:**
   - Press `Windows Key`
   - Type: `cmd`
   - **Right-click** "Command Prompt"
   - Select **"Run as Administrator"**

2. **Start MySQL:**
   ```cmd
   cd C:\Users\Farha\OneDrive\Desktop\trustek\backend
   net start MySQL95
   mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;"
   ```

## Quick One-Liner (PowerShell as Admin)

```powershell
Start-Process powershell -Verb RunAs -ArgumentList '-NoExit', '-Command', 'cd C:\Users\Farha\OneDrive\Desktop\trustek\backend; net start MySQL95; mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;"; echo "MySQL is ready!"'
```

## Verify MySQL is Running

After starting MySQL, verify it's running:

```powershell
# Check service status
Get-Service MySQL*

# Test connection
mysql -u root -proot -e "SHOW DATABASES;"
```

## Then Start Backend

Once MySQL is running:

```powershell
cd backend
mvn spring-boot:run
```

## Alternative: Use Docker (If MySQL Installation Issues)

If you have Docker installed:

```powershell
docker run -d --name mysql-trustek -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.0

# Wait a few seconds for MySQL to start
Start-Sleep -Seconds 10

# Create database
docker exec -i mysql-trustek mysql -uroot -proot -e "CREATE DATABASE trustek_db;"
```

This doesn't require admin rights to start (Docker Desktop needs to be running).

## Troubleshooting

### "MySQL95 service not found"
- Check actual service name: `Get-Service | Where-Object {$_.DisplayName -like "*MySQL*"}`
- Try other names: MySQL80, MySQL, MySQL57

### "Still getting Access Denied"
- Make sure you're running PowerShell/CMD as Administrator
- Check User Account Control (UAC) settings
- Try: `Start-Process powershell -Verb RunAs`

### "Cannot connect to MySQL"
- Verify service is running: `Get-Service MySQL*`
- Check port 3306: `Test-NetConnection -ComputerName localhost -Port 3306`
- Try restarting MySQL service

### "Database already exists"
- That's fine! MySQL will use the existing database
- Backend will work normally

---

**After MySQL is running**, your backend should start successfully! ✅



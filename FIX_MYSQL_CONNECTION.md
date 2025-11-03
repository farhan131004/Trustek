# Fix MySQL Connection Error

## 🔴 Current Error:
```
Communications link failure
The driver has not received any packets from the server.
```

This means **MySQL server is not running** or not accessible.

---

## ✅ Solution Steps

### Step 1: Check if MySQL is Running

**PowerShell:**
```powershell
# Check MySQL service status
Get-Service | Where-Object {$_.DisplayName -like "*MySQL*"}

# Check if port 3306 is listening
Test-NetConnection -ComputerName localhost -Port 3306
```

**Expected Output:**
```
Status           : Open
TcpTestSucceeded : True
```

**If Status is "Closed" or "Filtered"** → MySQL is not running!

---

### Step 2: Start MySQL Service

**Option A: Using Services (GUI)**
1. Press `Win + R`
2. Type: `services.msc`
3. Find **MySQL80** or **MySQL**
4. Right-click → **Start**

**Option B: Using PowerShell (Admin)**
```powershell
# Run PowerShell as Administrator, then:
Start-Service MySQL80
# OR
Start-Service MySQL
```

**Option C: Using Command Prompt (Admin)**
```cmd
net start MySQL80
# OR
net start MySQL
```

---

### Step 3: Verify MySQL is Running

```powershell
# Test connection
mysql -u root -p
# Enter password: root (or your MySQL password)
```

**If you can't connect, try:**
```powershell
# Check what MySQL services exist
Get-Service | Where-Object {$_.DisplayName -like "*MySQL*"}

# Try starting each one
Start-Service MySQL80
# OR
Start-Service MySQL
```

---

### Step 4: Create Database

```powershell
# Connect to MySQL
mysql -u root -p
# Enter password when prompted
```

**Then run SQL:**
```sql
-- Create database
CREATE DATABASE IF NOT EXISTS trustek_db;

-- Verify it was created
SHOW DATABASES;

-- Exit
EXIT;
```

---

### Step 5: Verify Database Configuration

Check `backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/trustek_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=root  # ← Change this if your password is different
```

**If your MySQL password is NOT "root":**
1. Update the password in `application.properties`
2. OR set it via environment variable:
   ```powershell
   $env:SPRING_DATASOURCE_PASSWORD="your_password"
   ```

---

### Step 6: Fix Port Issue (JAR Built with Old Config)

**The JAR was built with port 8080, but we need 8081.**

**Option A: Override Port via Command Line**
```powershell
cd "Trustek\backend"
java -jar target\backend-1.0.0.jar --server.port=8081
```

**Option B: Rebuild JAR with Updated Config**
```powershell
cd "Trustek\backend"
# If you have Maven:
mvn clean package
java -jar target\backend-1.0.0.jar
```

---

### Step 7: Restart Spring Boot

**After MySQL is running:**
```powershell
cd "Trustek\backend"
java -jar target\backend-1.0.0.jar --server.port=8081
```

**Expected Output:**
```
Started BackendApplication in X.XXX seconds
```

**No more MySQL connection errors!** ✅

---

## 🧪 Quick Test Script

Save as `test-mysql.ps1`:

```powershell
Write-Host "Testing MySQL Connection..." -ForegroundColor Yellow

# Check MySQL service
$mysqlService = Get-Service | Where-Object {$_.DisplayName -like "*MySQL*"} | Select-Object -First 1

if ($mysqlService) {
    Write-Host "MySQL Service Found: $($mysqlService.DisplayName)" -ForegroundColor Green
    Write-Host "Status: $($mysqlService.Status)" -ForegroundColor $(if ($mysqlService.Status -eq 'Running') { 'Green' } else { 'Red' })
    
    if ($mysqlService.Status -ne 'Running') {
        Write-Host "Starting MySQL service..." -ForegroundColor Yellow
        Start-Service $mysqlService.Name
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "❌ MySQL service not found!" -ForegroundColor Red
    Write-Host "Please install MySQL or check service name." -ForegroundColor Yellow
    exit 1
}

# Test port
Write-Host "`nTesting port 3306..." -ForegroundColor Yellow
$portTest = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue

if ($portTest.TcpTestSucceeded) {
    Write-Host "✅ Port 3306 is open" -ForegroundColor Green
} else {
    Write-Host "❌ Port 3306 is closed" -ForegroundColor Red
    Write-Host "MySQL may not be listening on port 3306" -ForegroundColor Yellow
}

# Test MySQL connection
Write-Host "`nTesting MySQL connection..." -ForegroundColor Yellow
try {
    $result = mysql -u root -proot -e "SELECT 'Connection OK' AS Status;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MySQL connection successful!" -ForegroundColor Green
        
        # Check database
        $dbCheck = mysql -u root -proot -e "SHOW DATABASES LIKE 'trustek_db';" 2>&1
        if ($dbCheck -match "trustek_db") {
            Write-Host "✅ Database 'trustek_db' exists" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Database 'trustek_db' not found. Creating..." -ForegroundColor Yellow
            mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>&1 | Out-Null
            Write-Host "✅ Database created" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ MySQL connection failed!" -ForegroundColor Red
        Write-Host "Check your password in application.properties" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Could not test MySQL connection" -ForegroundColor Red
    Write-Host "Make sure MySQL client is in PATH" -ForegroundColor Yellow
}

Write-Host "`nDone!" -ForegroundColor Cyan
```

**Run it:**
```powershell
.\test-mysql.ps1
```

---

## 🔧 Alternative: Skip Database Temporarily (For Testing)

If you just want to test the API without MySQL, you can temporarily disable database initialization:

**Add to `application.properties`:**
```properties
# Skip database initialization (use only for testing!)
spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
```

**⚠️ Warning:** This will disable database features. Use only for testing API endpoints that don't require database.

---

## 📝 Summary

1. ✅ **Start MySQL service** (services.msc or PowerShell)
2. ✅ **Create database**: `CREATE DATABASE trustek_db;`
3. ✅ **Verify password** in `application.properties`
4. ✅ **Run Spring Boot** with port override: `java -jar target\backend-1.0.0.jar --server.port=8081`

---

## 🚨 Common Issues

### "Access denied for user 'root'@'localhost'"
→ Check password in `application.properties`

### "Port 3306 is closed"
→ MySQL service is not running → Start it

### "Can't connect to MySQL server"
→ MySQL is not installed or not in PATH → Install MySQL

### "JAR shows port 8080 instead of 8081"
→ Override with: `--server.port=8081` OR rebuild JAR

---

**After fixing, Spring Boot should start successfully! 🎉**



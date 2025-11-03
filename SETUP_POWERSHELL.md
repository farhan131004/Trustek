# PowerShell Setup Guide - Fix Dependencies

## 🔧 Issue 1: Flask Module Not Found

### Solution: Install Python Dependencies

**Step 1: Navigate to ml-service directory**
```powershell
cd "Trustek\ml-service"
```

**Step 2: Create virtual environment (if not exists)**
```powershell
python -m venv venv
```

**Step 3: Activate virtual environment**
```powershell
.\venv\Scripts\Activate.ps1
```

**If you get execution policy error, run this first:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Step 4: Install dependencies**
```powershell
pip install -r requirements.txt
```

**Step 5: Verify Flask is installed**
```powershell
python -c "import flask; print('Flask installed:', flask.__version__)"
```

**Step 6: Run Flask service**
```powershell
python app.py
```

---

## 🔧 Issue 2: Maven Not Found

### Option A: Use Pre-built JAR (Fastest Solution)

Since there's already a JAR file built, you can use it directly!

**Step 1: Navigate to backend directory**
```powershell
cd "Trustek\backend"
```

**Step 2: Run the JAR file**
```powershell
java -jar target\backend-1.0.0.jar
```

**If the JAR doesn't exist or is outdated, build it using Gradle wrapper (if available) or install Maven.**

---

### Option B: Install Maven (Recommended for Development)

**Step 1: Download Maven**
- Go to: https://maven.apache.org/download.cgi
- Download: `apache-maven-3.9.x-bin.zip`

**Step 2: Extract Maven**
```powershell
# Extract to C:\Program Files\Apache\maven (or your preferred location)
Expand-Archive -Path "apache-maven-3.9.x-bin.zip" -DestinationPath "C:\Program Files\Apache"
```

**Step 3: Add Maven to PATH**
```powershell
# Open PowerShell as Administrator
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Apache\maven\bin", [EnvironmentVariableTarget]::Machine)
```

**Step 4: Restart PowerShell and verify**
```powershell
mvn -version
```

**Step 5: Run Spring Boot**
```powershell
cd "Trustek\backend"
mvn spring-boot:run
```

---

### Option C: Use Maven Wrapper (If Available)

Check if there's a `mvnw` or `mvnw.cmd` file in the backend directory:

```powershell
cd "Trustek\backend"
.\mvnw.cmd spring-boot:run
```

---

## 🚀 Complete Setup Script for PowerShell

Save this as `setup.ps1` and run it:

```powershell
# Trustek Setup Script for PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TRUSTEK - SETUP SCRIPT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "[1/4] Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python not found! Please install Python 3.9+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green

# Setup Flask
Write-Host "[2/4] Setting up Flask service..." -ForegroundColor Yellow
Set-Location "ml-service"

if (-Not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Gray
& ".\venv\Scripts\Activate.ps1"

Write-Host "Installing Python dependencies..." -ForegroundColor Gray
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Python dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Flask dependencies installed" -ForegroundColor Green

Set-Location ".."

# Check Java
Write-Host "[3/4] Checking Java..." -ForegroundColor Yellow
$javaVersion = java -version 2>&1 | Select-Object -First 1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Java not found! Please install Java 21+" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Java found: $javaVersion" -ForegroundColor Green

# Check Maven or use JAR
Write-Host "[4/4] Checking Maven..." -ForegroundColor Yellow
$mavenVersion = mvn -version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Maven not found, checking for JAR file..." -ForegroundColor Yellow
    Set-Location "backend"
    if (Test-Path "target\backend-1.0.0.jar") {
        Write-Host "✅ Found JAR file! You can run it with: java -jar target\backend-1.0.0.jar" -ForegroundColor Green
    } else {
        Write-Host "❌ No JAR file found. Please install Maven or build the project." -ForegroundColor Red
    }
    Set-Location ".."
} else {
    Write-Host "✅ Maven found: $($mavenVersion | Select-Object -First 1)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start Flask:   cd ml-service && .\venv\Scripts\Activate.ps1 && python app.py" -ForegroundColor White
Write-Host "2. Start Backend: cd backend && java -jar target\backend-1.0.0.jar" -ForegroundColor White
Write-Host "   (or: cd backend && mvn spring-boot:run)" -ForegroundColor Gray
Write-Host "3. Start Frontend: cd trustek-app--master && npm run dev" -ForegroundColor White
Write-Host ""
```

---

## 🎯 Quick Start Commands (PowerShell)

### Terminal 1: Flask Service

```powershell
cd "Trustek\ml-service"
.\venv\Scripts\Activate.ps1
python app.py
```

**Expected Output:**
```
🚀 Initializing models...
✅ Fake news model loaded successfully
✅ Sentiment model loaded successfully
✅ All models loaded successfully
🌐 Starting Flask server on port 5000...
```

### Terminal 2: Spring Boot Backend

**Option 1: Using JAR (Fastest)**
```powershell
cd "Trustek\backend"
java -jar target\backend-1.0.0.jar
```

**Option 2: Using Maven (If installed)**
```powershell
cd "Trustek\backend"
mvn spring-boot:run
```

**Expected Output:**
```
Started BackendApplication in X.XXX seconds
```

### Terminal 3: Frontend

```powershell
cd "Trustek\trustek-app--master"
npm run dev
```

**Expected Output:**
```
VITE vX.X.X  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## 🔍 Troubleshooting

### Python Virtual Environment Issues

**If activation fails:**
```powershell
# Set execution policy (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try again
.\venv\Scripts\Activate.ps1
```

**If pip install fails:**
```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Then install requirements
pip install -r requirements.txt
```

### Maven Not Found - Quick Fix

**Use the pre-built JAR instead:**
```powershell
cd "Trustek\backend"
java -jar target\backend-1.0.0.jar
```

**If JAR doesn't exist, download Maven:**
1. Go to: https://maven.apache.org/download.cgi
2. Download: `apache-maven-3.9.x-bin.zip`
3. Extract to `C:\Program Files\Apache\maven`
4. Add to PATH: `C:\Program Files\Apache\maven\bin`

### Port Already in Use

**Check what's using the port:**
```powershell
# Check port 5000 (Flask)
netstat -ano | findstr :5000

# Check port 8081 (Spring Boot)
netstat -ano | findstr :8081

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

## ✅ Verification Checklist

After setup, verify everything works:

```powershell
# Test Flask
curl http://localhost:5000/health

# Test Spring Boot
curl http://localhost:8081/api/health

# Test Frontend (open in browser)
# http://localhost:8080 or http://localhost:5173
```

---

## 📝 Summary

1. **Flask**: Install dependencies in virtual environment
2. **Maven**: Use pre-built JAR OR install Maven
3. **Start Services**: Flask → Spring Boot → Frontend

**Everything should work now! 🎉**


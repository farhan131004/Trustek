# MySQL Setup Guide for Trustek Backend

## Issue
The backend is failing to start because it cannot connect to MySQL. Error:
```
Communications link failure
Connection refused: getsockopt
```

## Solution

### Step 1: Start MySQL Service

**Windows:**
```powershell
# Check if MySQL service is running
Get-Service MySQL*

# Start MySQL service if not running
Start-Service MySQL80
# OR
net start MySQL80
# OR
net start MySQL
```

**Linux/Mac:**
```bash
# Check if MySQL is running
sudo systemctl status mysql
# OR
sudo service mysql status

# Start MySQL if not running
sudo systemctl start mysql
# OR
sudo service mysql start
```

**Alternative (if MySQL is installed but service isn't configured):**
```bash
# Navigate to MySQL bin directory (usually in Program Files on Windows)
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Start MySQL server manually
mysqld --console
```

### Step 2: Create Database

Once MySQL is running, create the database:

**Windows (MySQL Command Line or PowerShell):**
```powershell
mysql -u root -p
# Enter password: root (or your MySQL root password)
```

**Linux/Mac:**
```bash
mysql -u root -p
# Enter password: root (or your MySQL root password)
```

**In MySQL shell:**
```sql
CREATE DATABASE IF NOT EXISTS trustek_db;
SHOW DATABASES;
USE trustek_db;
EXIT;
```

### Step 3: Verify Database Connection

Test the connection from command line:
```bash
mysql -u root -p -h localhost -P 3306 trustek_db
```

If connection succeeds, you're ready!

### Step 4: Restart Backend

```bash
cd backend
mvn spring-boot:run
```

## Troubleshooting

### MySQL Service Not Found
If MySQL is not installed, download and install:
- **Windows**: https://dev.mysql.com/downloads/installer/
- **Linux**: `sudo apt-get install mysql-server` (Ubuntu/Debian)
- **Mac**: `brew install mysql`

### Wrong Password
If you get "Access denied", check your MySQL root password:

**Update application.properties:**
```properties
spring.datasource.password=YOUR_ACTUAL_PASSWORD
```

### Port 3306 Already in Use
If port 3306 is occupied by another MySQL instance:
```properties
# Update application.properties with different port
spring.datasource.url=jdbc:mysql://localhost:3307/trustek_db?...
```

### Create Database via Command Line (if MySQL CLI doesn't work)
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS trustek_db;"
```

### Reset MySQL Password (if needed)
```bash
# Windows
mysqladmin -u root -p password root

# Or reset via MySQL:
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;
EXIT;
```

## Quick Check Script

**Windows PowerShell:**
```powershell
# Check if MySQL port is listening
Test-NetConnection -ComputerName localhost -Port 3306

# Check MySQL service
Get-Service | Where-Object {$_.DisplayName -like "*MySQL*"}
```

**Linux/Mac:**
```bash
# Check if MySQL port is listening
netstat -an | grep 3306
# OR
lsof -i :3306
```

## Expected Result

After MySQL is running and database is created:
- Backend should start successfully
- You should see: `Started BackendApplication in X.XXX seconds`
- No "Connection refused" errors
- Tables will be auto-created by Hibernate

## Alternative: Use H2 In-Memory Database (Development Only)

If you want to test without MySQL temporarily, you can switch to H2:

1. Add to `pom.xml`:
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

2. Update `application.properties`:
```properties
spring.datasource.url=jdbc:h2:mem:trustek_db
spring.datasource.driver-class-name=org.h2.Driver
spring.h2.console.enabled=true
```

**Note**: H2 is in-memory, so data is lost on restart. Use only for development/testing.



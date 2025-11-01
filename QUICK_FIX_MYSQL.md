# Quick Fix: MySQL Connection Error

## Problem
```
Communications link failure
Connection refused: getsockopt
```

## Quick Solution (Windows)

### Option 1: Use the Check Script
```powershell
cd backend
.\check_mysql.bat
```

### Option 2: Manual Steps

1. **Start MySQL Service:**
```powershell
net start MySQL80
# OR if that doesn't work:
net start MySQL
```

2. **Create Database:**
```powershell
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;"
```

3. **Verify Connection:**
```powershell
mysql -u root -proot -e "SHOW DATABASES;"
```

4. **Restart Backend:**
```powershell
cd backend
mvn spring-boot:run
```

## Quick Solution (Linux/Mac)

### Option 1: Use the Check Script
```bash
cd backend
chmod +x check_mysql.sh
./check_mysql.sh
```

### Option 2: Manual Steps

1. **Start MySQL:**
```bash
sudo systemctl start mysql
# OR
sudo service mysql start
```

2. **Create Database:**
```bash
mysql -u root -proot -e "CREATE DATABASE IF NOT EXISTS trustek_db;"
# OR if password is different:
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS trustek_db;"
```

3. **Restart Backend:**
```bash
cd backend
mvn spring-boot:run
```

## Verify MySQL is Running

**Windows:**
```powershell
Get-Service MySQL*
Test-NetConnection -ComputerName localhost -Port 3306
```

**Linux/Mac:**
```bash
sudo systemctl status mysql
# OR
netstat -an | grep 3306
```

## Common Issues

### "MySQL service not found"
- Install MySQL: https://dev.mysql.com/downloads/installer/
- Or use Docker: `docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.0`

### "Access denied"
- Update password in `backend/src/main/resources/application.properties`
- Change: `spring.datasource.password=your_actual_password`

### "Port 3306 in use"
- Find what's using it: `netstat -ano | findstr :3306` (Windows)
- Stop conflicting MySQL instance
- Or change port in application.properties

## After Fixing

✅ Backend should start successfully  
✅ No more "Connection refused" errors  
✅ Tables auto-created by Hibernate  
✅ Ready to accept API requests



# MySQL Database Setup Guide

## 🔴 Current Error:
```
Access denied for user 'root'@'localhost' (using password: NO)
```

This means Spring Boot is not reading the password correctly, OR the database doesn't exist.

## ✅ Solution Steps:

### Step 1: Verify MySQL is Running

```bash
# Windows PowerShell
Get-Service -Name "*mysql*"

# Or check in Services app:
# Win+R → services.msc → Find MySQL80 or MySQL
```

### Step 2: Create the Database

```bash
# Open MySQL command line
mysql -u root -p

# Enter your password when prompted: Farhan@2003
```

Then run:
```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS trustek_db;

-- Verify it was created
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

### Step 3: Test Connection

Test if you can connect with the password:
```bash
mysql -u root -p
# Enter: Farhan@2003
```

### Step 4: Verify Application Properties

Make sure `backend/src/main/resources/application.properties` has:
```properties
spring.datasource.password=Farhan@2003
```

### Step 5: Alternative - URL-Encode Password

If the password still doesn't work, try URL-encoding the `@` symbol in the connection URL:

**Option A: Put password in URL (URL-encoded)**
```properties
spring.datasource.url=jdbc:mysql://root:Farhan%402003@localhost:3306/trustek_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=
spring.datasource.password=
```

**Option B: Use environment variable**
Create a `.env` file or set:
```bash
# PowerShell
$env:SPRING_DATASOURCE_PASSWORD="Farhan@2003"
```

### Step 6: Restart Backend

After making changes:
```bash
cd backend
mvn spring-boot:run
```

## 🧪 Quick Test Script

Run this to test your MySQL connection:
```sql
-- Connect to MySQL
mysql -u root -p

-- Test connection
SELECT 'Connection successful!' AS Status;

-- Create database
CREATE DATABASE IF NOT EXISTS trustek_db;

-- Verify
USE trustek_db;
SHOW TABLES;

EXIT;
```

## 🔧 Troubleshooting

### If password still doesn't work:

1. **Check MySQL root user password:**
   ```sql
   mysql -u root -p
   # Try to connect - if it fails, password is wrong
   ```

2. **Reset MySQL root password (if needed):**
   ```sql
   -- Stop MySQL service first
   -- Then start in safe mode and reset password
   ```

3. **Create a new MySQL user:**
   ```sql
   CREATE USER 'trustek_user'@'localhost' IDENTIFIED BY 'trustek_pass123';
   GRANT ALL PRIVILEGES ON trustek_db.* TO 'trustek_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
   Then update `application.properties`:
   ```properties
   spring.datasource.username=trustek_user
   spring.datasource.password=trustek_pass123
   ```

### Common Issues:

| Issue | Solution |
|-------|----------|
| MySQL not running | Start MySQL service |
| Database doesn't exist | Run `CREATE DATABASE trustek_db;` |
| Wrong password | Verify password in MySQL |
| Port 3306 blocked | Check firewall settings |
| Special characters in password | URL-encode or escape properly |

## ✅ Success Indicators

When it works, you should see:
```
HikariPool-1 - Starting...
HikariPool-1 - Start completed.
Started BackendApplication in X.XXX seconds
```

The tables will be created automatically by Hibernate!


#!/bin/bash

echo "========================================"
echo "  MySQL Connection Check for Trustek"
echo "========================================"
echo

# Check if MySQL is running
if systemctl is-active --quiet mysql 2>/dev/null || service mysql status >/dev/null 2>&1; then
    echo "[OK] MySQL service is running"
else
    echo "[ERROR] MySQL service is NOT running"
    echo
    echo "Attempting to start MySQL service..."
    sudo systemctl start mysql 2>/dev/null || sudo service mysql start 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "[OK] MySQL service started successfully"
    else
        echo "[ERROR] Could not start MySQL service automatically"
        echo "Please start it manually: sudo systemctl start mysql"
        exit 1
    fi
fi

echo
echo "Testing MySQL connection..."
mysql -u root -proot -e "SELECT 1;" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "[OK] MySQL connection successful"
    MYSQL_PASS="root"
else
    echo "[WARNING] MySQL connection failed with default credentials"
    echo "Testing without password..."
    mysql -u root -e "SELECT 1;" >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "[OK] MySQL connection works without password"
        MYSQL_PASS=""
        echo "[INFO] Update application.properties: spring.datasource.password="
    else
        echo "[ERROR] Cannot connect to MySQL"
        echo "Please check:"
        echo "  1. MySQL is installed and running"
        echo "  2. Root password is correct"
        exit 1
    fi
fi

echo
echo "Creating database if it doesn't exist..."
if [ -z "$MYSQL_PASS" ]; then
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>/dev/null
else
    mysql -u root -p$MYSQL_PASS -e "CREATE DATABASE IF NOT EXISTS trustek_db;" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    echo "[OK] Database trustek_db is ready"
else
    echo "[WARNING] Could not create database automatically"
    echo "Please create it manually: CREATE DATABASE trustek_db;"
fi

echo
echo "========================================"
echo "  MySQL is ready for Trustek Backend!"
echo "========================================"
echo



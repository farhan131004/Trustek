@echo off
echo 🚀 Setting up Trustek Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Check if MongoDB is installed
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB is not installed. Please install MongoDB 4.4+ first.
    echo    You can install it from: https://docs.mongodb.com/manual/installation/
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy env.example .env
    echo ✅ Created .env file. Please edit it with your configuration.
) else (
    echo ✅ .env file already exists
)

REM Create logs directory
echo 📁 Creating logs directory...
if not exist logs mkdir logs

REM Build TypeScript
echo 🔨 Building TypeScript...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build TypeScript
    pause
    exit /b 1
)

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit .env file with your API keys and configuration
echo 2. Start MongoDB service
echo 3. Run 'npm run dev' to start the development server
echo 4. Run 'npm start' to start the production server
echo.
echo API will be available at: http://localhost:5000
echo Health check: http://localhost:5000/health
echo.
echo Required API Keys:
echo - GOOGLE_GEMINI_API_KEY (required for fake news detection)
echo - VIRUSTOTAL_API_KEY (optional, for website scanning)
echo - PHISHTANK_API_KEY (optional, for website scanning)
echo.
echo Happy coding! 🚀
pause

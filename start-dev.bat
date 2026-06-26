@echo off
echo Starting TGA CRM Development Environment...

REM Start PHP Backend Server in a new window
echo Starting PHP Development Server on http://localhost:8000
start "TGA CRM API" cmd /c "cd crm-api && php -S localhost:8000 index.php"

REM Start Vite Frontend Server in this window
echo Starting Vite Frontend Server...
npm run dev

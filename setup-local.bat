@echo off
echo Running TGA CRM Local Setup...

echo.
echo Installing Node.js dependencies...
call npm install

echo.
echo Setting up PHP Backend Environment...
if not exist "crm-api\.env" (
    copy "crm-api\.env.example" "crm-api\.env"
    echo Created crm-api\.env from example. Please configure database credentials in crm-api\.env.
) else (
    echo crm-api\.env already exists. Skipping.
)

echo.
echo Setting up Frontend Environment...
if not exist ".env" (
    copy ".env.example" ".env"
    echo Created frontend .env from example.
) else (
    echo frontend .env already exists. Skipping.
)

echo.
echo Setting up directory permissions (Windows - Optional for basic dev)...
if not exist "crm-api\logs" mkdir "crm-api\logs"
if not exist "crm-api\uploads" mkdir "crm-api\uploads"

echo.
echo Setup Complete!
echo Next Steps:
echo 1. Ensure MySQL is running locally.
echo 2. Create the database and import any seed files.
echo 3. Run 'start-dev.bat' to launch both backend and frontend servers simultaneously.
echo.
pause

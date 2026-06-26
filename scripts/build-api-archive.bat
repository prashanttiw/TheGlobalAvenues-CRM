@echo off
echo TGA CRM API - Production Build Script
echo =====================================
echo.

set BUILD_DIR=dist-api

if exist %BUILD_DIR% rmdir /S /Q %BUILD_DIR%
mkdir %BUILD_DIR%
mkdir %BUILD_DIR%\crm-api
mkdir %BUILD_DIR%\cron

echo Copying API files to staging directory...
xcopy crm-api %BUILD_DIR%\crm-api /E /I /H /Y /EXCLUDE:scripts\exclude.txt > nul

echo Copying cron files to staging directory...
xcopy cron %BUILD_DIR%\cron /E /I /H /Y > nul

echo.
echo Packaging into build-api.zip...
if exist build-api.zip del build-api.zip
powershell -Command "Compress-Archive -Path '%BUILD_DIR%\*' -DestinationPath 'build-api.zip'"

echo.
echo Cleaning up...
rmdir /S /Q %BUILD_DIR%

echo.
echo Build complete! 
echo Next Steps:
echo 1. Upload 'build-api.zip' to Bluehost (cPanel File Manager).
echo 2. Extract into the public_html directory (NOT public_html/crm-api).
echo 3. Ensure your production .env is correctly configured in public_html/crm-api/.env.
echo.
pause

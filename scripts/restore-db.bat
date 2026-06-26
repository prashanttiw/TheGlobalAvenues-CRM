@echo off
echo TGA CRM - Database Restore Utility
echo ==================================
echo.

if "%~1"=="" (
    echo Usage: restore-db.bat path\to\backup.sql
    echo.
    echo Please provide the path to the SQL file.
    exit /b 1
)

set SQL_FILE=%~1

if not exist "%SQL_FILE%" (
    echo Error: File "%SQL_FILE%" not found.
    exit /b 1
)

echo Warning: This will completely overwrite the existing local database.
set /p CONFIRM="Are you sure you want to proceed? (y/N): "
if /i "%CONFIRM%" neq "y" (
    echo Aborted.
    exit /b 0
)

echo.
echo Parsing database credentials from crm-api\.env...

for /f "tokens=1,2 delims==" %%a in ('findstr /b "DB_HOST" crm-api\.env') do set DB_HOST=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr /b "DB_USER" crm-api\.env') do set DB_USER=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr /b "DB_PASS" crm-api\.env') do set DB_PASS=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr /b "DB_NAME" crm-api\.env') do set DB_NAME=%%b

echo Restoring database %DB_NAME% at %DB_HOST%...

REM Check if the file is a gzip-compressed backup (.sql.gz)
echo %SQL_FILE% | findstr /i ".gz" > nul
if %ERRORLEVEL% equ 0 (
    echo Detected compressed backup. Decompressing with PowerShell...
    set SQL_DECOMPRESSED=%TEMP%\tga_crm_restore_temp.sql
    powershell -Command "$in=[System.IO.File]::OpenRead('%SQL_FILE%'); $out=[System.IO.File]::Create('%SQL_DECOMPRESSED%'); $gz=New-Object System.IO.Compression.GZipStream($in, [System.IO.Compression.CompressionMode]::Decompress); $gz.CopyTo($out); $gz.Close(); $out.Close(); $in.Close()"
    mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% < "%SQL_DECOMPRESSED%"
    del "%SQL_DECOMPRESSED%"
) else (
    mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% %DB_NAME% < "%SQL_FILE%"
)

if %ERRORLEVEL% equ 0 (
    echo Restore completed successfully!
) else (
    echo Restore failed. Please check MySQL logs or credentials.
)
pause

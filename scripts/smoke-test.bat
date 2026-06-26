@echo off
echo TGA CRM - Production Smoke Test
echo ===============================
echo.

set API_URL=https://api.theglobalavenues.com/api/health
set /p "TARGET_URL=Enter API Health URL (default: %API_URL%): " || set TARGET_URL=%API_URL%

echo.
echo Pinging %TARGET_URL% ...
echo.

REM Use powershell to fetch the JSON and display it cleanly
powershell -Command "$response = Invoke-WebRequest -Uri '%TARGET_URL%' -UseBasicParsing; if ($response.StatusCode -eq 200) { Write-Host 'SUCCESS: 200 OK' -ForegroundColor Green; $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5 } else { Write-Host 'FAILED: ' $response.StatusCode -ForegroundColor Red; exit 1 }"

if %ERRORLEVEL% equ 0 (
    echo.
    echo Smoke test completed successfully! Database and permissions are verified.
) else (
    echo.
    echo Smoke test FAILED. Check API logs.
)
pause

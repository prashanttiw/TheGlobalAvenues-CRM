@echo off
echo TGA CRM Frontend - Vercel Deployment Script
echo ===========================================
echo.

echo Building production assets...
call npm run build

echo.
echo Deploying to Vercel...
echo Make sure Vercel CLI is installed globally (npm i -g vercel)
call npx vercel --prod

echo.
echo Deployment triggered! Check your Vercel dashboard for status.
pause

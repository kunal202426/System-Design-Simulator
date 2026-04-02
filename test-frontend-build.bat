@echo off
REM Test Frontend Build
echo ==========================================
echo Testing Frontend Build
echo ==========================================
cd frontend
echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    exit /b 1
)
echo.
echo Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo.
echo ==========================================
echo Frontend Build SUCCESS!
echo Output directory: frontend\dist
echo ==========================================
echo.
echo Checking build output...
dir dist
echo.
pause

@echo off
REM Test Backend Dependencies
echo ==========================================
echo Testing Backend Dependencies
echo ==========================================
cd backend
echo.
echo Installing Python dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: pip install failed
    exit /b 1
)
echo.
echo ==========================================
echo Backend Dependencies Installed Successfully!
echo ==========================================
echo.
echo Testing backend startup (will run for 5 seconds)...
echo Press Ctrl+C to stop early if needed
echo.
timeout /t 2 /nobreak >nul
start /b python -m uvicorn main:app --host 0.0.0.0 --port 8000
timeout /t 5 /nobreak
taskkill /F /IM python.exe /T >nul 2>&1
echo.
echo Backend test complete!
echo.
pause

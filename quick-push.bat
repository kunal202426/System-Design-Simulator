@echo off
echo Pushing vercel.json fix to GitHub...
git push origin main --force
if %errorlevel% neq 0 (
    echo.
    echo Push failed - try manually:
    echo git push origin main
    pause
    exit /b 1
)
echo.
echo SUCCESS! Updated vercel.json pushed to GitHub
echo.
pause

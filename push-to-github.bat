@echo off
REM Push to GitHub
echo ==========================================
echo Pushing to GitHub
echo ==========================================
echo.

REM Check if we're on the right branch
git branch --show-current
echo.

echo Pushing to remote...
git push origin main

if %errorlevel% neq 0 (
    echo ERROR: Git push failed
    echo.
    echo Common issues:
    echo - Not authenticated with GitHub
    echo - Wrong branch name
    echo - Remote repository doesn't exist
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo SUCCESS: Pushed to GitHub!
echo ==========================================
echo.
echo Your repository is now ready for deployment
echo.
pause

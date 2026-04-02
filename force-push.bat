@echo off
REM Force Push to GitHub (Use with caution!)
echo ==========================================
echo FORCE PUSH to GitHub
echo ==========================================
echo.
echo WARNING: This will OVERWRITE the remote repository
echo with your local changes. Any changes on GitHub that
echo you don't have locally will be LOST!
echo.
echo This is safe if:
echo - You're the only one working on this repository
echo - You're sure your local changes are the most recent
echo - You want to replace what's on GitHub completely
echo.
echo Press Ctrl+C to cancel, or
pause
echo.

echo Removing git lock file if exists...
if exist ".git\index.lock" (
    del ".git\index.lock"
    echo Lock file removed
)
echo.

echo Force pushing to GitHub...
git push origin main --force
if %errorlevel% neq 0 (
    echo ERROR: Force push failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo SUCCESS: Force pushed to GitHub!
echo ==========================================
echo.
echo Your local changes have overwritten the remote
echo Ready for deployment!
echo.
pause

@echo off
REM Sync with GitHub and Push Changes
echo ==========================================
echo Syncing with GitHub
echo ==========================================
echo.

echo Step 1: Fetching remote changes...
git fetch origin
if %errorlevel% neq 0 (
    echo ERROR: Could not fetch from remote
    pause
    exit /b 1
)
echo Remote changes fetched
echo.

echo Step 2: Pulling and merging remote changes...
git pull origin main --no-rebase
if %errorlevel% neq 0 (
    echo.
    echo ==========================================
    echo MERGE CONFLICT DETECTED
    echo ==========================================
    echo.
    echo There are conflicts between your local changes
    echo and the remote repository.
    echo.
    echo Option 1 - FORCE PUSH (Overwrites remote with your changes):
    echo    git push origin main --force
    echo.
    echo Option 2 - Keep both (manual merge):
    echo    1. Open the conflicted files
    echo    2. Resolve conflicts manually
    echo    3. Run: git add .
    echo    4. Run: git commit -m "Merge remote changes"
    echo    5. Run: git push origin main
    echo.
    echo Recommended: Use Option 1 if you're sure your local changes
    echo are the latest and you want to overwrite the remote.
    echo.
    pause
    exit /b 1
)
echo Merge successful
echo.

echo Step 3: Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo ERROR: Push failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo SUCCESS: Synced with GitHub!
echo ==========================================
echo.
echo Your changes are now on GitHub
echo Ready for deployment!
echo.
pause

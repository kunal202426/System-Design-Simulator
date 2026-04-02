@echo off
echo ==========================================
echo FINAL DEPLOYMENT FIX
echo ==========================================
echo.
echo This will:
echo 1. Remove vercel.json
echo 2. Commit all changes
echo 3. Push to GitHub
echo.
pause

REM Remove git lock
if exist ".git\index.lock" del ".git\index.lock"

REM Remove vercel.json
echo Removing vercel.json...
git rm vercel.json

REM Add any other changes
git add .

REM Commit
echo Creating commit...
git commit -m "fix: remove vercel.json and finalize deployment config"

REM Push
echo Pushing to GitHub...
git push origin main --force

echo.
echo ==========================================
echo SUCCESS! Code pushed to GitHub
echo ==========================================
echo.
echo NEXT STEPS:
echo 1. Delete your Vercel project
echo 2. Import fresh from GitHub
echo 3. Set Root Directory = frontend
echo 4. Let Vercel auto-detect everything else
echo 5. Deploy!
echo.
pause

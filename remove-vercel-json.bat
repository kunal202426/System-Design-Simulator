@echo off
echo Removing vercel.json...
if exist ".git\index.lock" del ".git\index.lock"
git rm vercel.json
git commit -m "remove vercel.json to let Vercel auto-detect settings"
git push origin main --force
echo.
echo Done! Now redeploy on Vercel.
pause

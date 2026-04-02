@echo off
echo Fixing and pushing vite.config.js...
if exist ".git\index.lock" del ".git\index.lock"
git add frontend\vite.config.js
git commit -m "fix: change minify from terser to esbuild for Vercel compatibility"
git push origin main --force
echo.
echo Done! Redeploy on Vercel now.
pause

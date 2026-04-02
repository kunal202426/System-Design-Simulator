@echo off
REM Git Commit Script - Fixes lock file and commits changes
echo ==========================================
echo Preparing Git Commit
echo ==========================================
echo.

REM Remove git lock file if it exists
if exist ".git\index.lock" (
    echo Removing stale lock file...
    del ".git\index.lock"
    echo Lock file removed
    echo.
)

REM Stage all changes
echo Staging changes...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Git add failed
    pause
    exit /b 1
)
echo All changes staged
echo.

REM Show status
echo Current status:
git status --short
echo.

REM Commit with message
echo Creating commit...
git commit -m "feat: add production deployment configuration for Vercel and Render" -m "" -m "- Add environment configuration files (.env.example)" -m "- Create frontend config.js for centralized environment variable handling" -m "- Fix hardcoded localhost URLs in websocket.js" -m "- Update vite.config.js with proxy configuration and build settings" -m "- Create nginx.conf for SPA routing with proper port configuration" -m "- Update frontend Dockerfile to use nginx.conf and expose port 80" -m "- Update backend CORS to support production domains via FRONTEND_URL env var" -m "- Fix backend Dockerfile to use PORT environment variable for Render" -m "- Remove unused Redis dependency from docker-compose.yml" -m "- Create vercel.json for frontend deployment configuration" -m "- Create render.yaml blueprint for backend deployment" -m "- Add comprehensive deployment guide in DEPLOYMENT.md" -m "- Update README.md with production deployment instructions" -m "- Add test scripts for manual build verification"

if %errorlevel% neq 0 (
    echo ERROR: Git commit failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo SUCCESS: Changes committed!
echo ==========================================
echo.
echo To push to GitHub, run:
echo    git push origin main
echo.
pause

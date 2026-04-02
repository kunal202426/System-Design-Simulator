@echo off
echo Committing vercel.json fix...
if exist ".git\index.lock" del ".git\index.lock"
git add vercel.json
git commit -m "fix: simplify vercel.json" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push origin main --force
echo.
echo Done! Try deploying again on Vercel.
pause

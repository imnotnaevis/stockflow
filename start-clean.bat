@echo off
echo ========================================================
echo StockFlow AI - Clean Production Launch
echo ========================================================

echo [1/3] Closing any conflicting processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] Building clean production assets (compiled CSS/JS)...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Check terminal output.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Starting StockFlow AI server on http://localhost:3000 ...
echo App is ready! Open http://localhost:3000 in your browser.
call npm run start


@echo off
echo Starting 12thFailJobs Server...
echo.
cd /d "%~dp0"
echo Server directory: %CD%
echo.
node server/index.js
echo.
echo Server stopped. Press any key to exit...
pause >nul

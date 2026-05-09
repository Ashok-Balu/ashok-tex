@echo off
REM ┌─────────────────────────────────────────────────────────────────────┐
REM │  MONGODB BACKUP SCRIPT (Windows)                                    │
REM │  ─────────────────────────────────────────────────────────────────  │
REM │  Double-click this file to create a backup before deployment        │
REM │                                                                     │
REM │  Requirements:                                                      │
REM │  - MongoDB Database Tools installed                                 │
REM │  - .env file configured with MONGO_URI                             │
REM └─────────────────────────────────────────────────────────────────────┘

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                    MONGODB BACKUP UTILITY                         ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

REM Check if node exists
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ ERROR: Node.js not found
    echo    Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Run backup script
echo Starting backup...
echo.
node scripts/backup.js

if errorlevel 1 (
    echo.
    echo ❌ Backup failed!
    echo    Make sure MongoDB Database Tools is installed
    echo    Download: https://www.mongodb.com/try/download/database-tools
) else (
    echo.
    echo ✅ Backup completed successfully!
)

echo.
pause

@echo off
title Antigravity Flashcards Launcher
echo =======================================
echo      Antigravity Flashcards Launcher
echo =======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 goto :NO_NODE

REM Check if node_modules folder exists
if not exist node_modules goto :INSTALL_DEPS

:START_SERVERS
echo Starting backend and frontend servers...
echo To stop the application, close this terminal window or press Ctrl+C.
echo.
echo Opening http://localhost:5173 in your default browser...
start http://localhost:5173
echo.

call npm run dev
goto :EOF

:INSTALL_DEPS
echo First-time setup: installing dependencies...
call npm install
if %errorlevel% neq 0 goto :INSTALL_FAIL
goto :START_SERVERS

:NO_NODE
echo [ERROR] Node.js is not installed or not in your PATH.
echo Please install Node.js version 18 or newer to run this application.
echo Get it from: https://nodejs.org/
echo.
pause
exit /b 1

:INSTALL_FAIL
echo.
echo [ERROR] Failed to install dependencies. Please check your internet connection.
pause
exit /b %errorlevel%

:EOF

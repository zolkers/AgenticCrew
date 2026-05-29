@echo off
setlocal

cd /d "%~dp0\.." || exit /b 1

if "%~1"=="--help" goto :help
if "%~1"=="-h" goto :help

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker is required on PATH.
  exit /b 1
)

if "%~1"=="--quality" goto :quality
if "%~1"=="quality" goto :quality
if not "%~1"=="" (
  echo Unknown option: %~1
  goto :help
)

echo Starting AgenticCrew frontend at http://localhost:5173
call docker compose up --build frontend
exit /b %errorlevel%

:quality
echo Running quality gates...
call docker compose run --build --rm quality || exit /b 1
call docker compose run --build --rm desktop-test sh -lc "find node_modules frontend/node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} + && npm ci && npm audit --audit-level=high"
exit /b %errorlevel%

:help
echo Usage:
echo   scripts\test-app.bat            Start the Docker frontend preview
echo   scripts\test-app.bat --quality  Run quality gates and Docker desktop tests
exit /b 0

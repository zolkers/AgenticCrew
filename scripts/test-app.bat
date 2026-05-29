@echo off
setlocal

cd /d "%~dp0\.." || exit /b 1

if "%~1"=="--help" goto :help
if "%~1"=="-h" goto :help

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required on PATH.
  exit /b 1
)

where python >nul 2>nul
if errorlevel 1 (
  echo python is required on PATH.
  exit /b 1
)

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

echo Installing project dependencies...
call npm ci || exit /b 1
call python -m pip install -e "workers/python[dev]" || exit /b 1

echo Starting AgenticCrew frontend at http://localhost:5173
call npm run docker:frontend
exit /b %errorlevel%

:quality
echo Installing project dependencies...
call npm ci || exit /b 1
call python -m pip install -e "workers/python[dev]" || exit /b 1

echo Running quality gates...
call npm run quality || exit /b 1
call npm run docker:desktop:test || exit /b 1
call npm audit --audit-level=high
exit /b %errorlevel%

:help
echo Usage:
echo   scripts\test-app.bat            Start the Docker frontend preview
echo   scripts\test-app.bat --quality  Run quality gates and Docker desktop tests
exit /b 0

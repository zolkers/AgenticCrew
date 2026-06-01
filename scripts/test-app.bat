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

docker info >nul 2>nul
if errorlevel 1 (
  echo Docker CLI is installed, but the Docker daemon is not reachable.
  echo Start Docker Desktop and wait until it says "Docker Desktop is running", then retry:
  echo   scripts\test-app.bat --quality
  echo.
  echo If you have local Rust build prerequisites installed, you can run the non-Docker gates with:
  echo   npm run quality
  echo   npm run desktop:test
  exit /b 1
)

if "%~1"=="--detach" goto :detach
if "%~1"=="detach" goto :detach
if "%~1"=="--down" goto :down
if "%~1"=="down" goto :down
if "%~1"=="--logs" goto :logs
if "%~1"=="logs" goto :logs
if "%~1"=="--ps" goto :ps
if "%~1"=="ps" goto :ps
if "%~1"=="--quality" goto :quality
if "%~1"=="quality" goto :quality
if not "%~1"=="" (
  echo Unknown option: %~1
  goto :help
)

echo Starting AgenticCrew frontend at http://localhost:5173
call docker compose up --build frontend
exit /b %errorlevel%

:detach
echo Starting AgenticCrew frontend in Docker at http://localhost:5173
call docker compose up --build -d frontend || exit /b 1
call docker compose ps
exit /b %errorlevel%

:down
call docker compose down
exit /b %errorlevel%

:logs
call docker compose logs -f frontend
exit /b %errorlevel%

:ps
call docker compose ps
exit /b %errorlevel%

:quality
echo Running quality gates...
call docker compose run --build --rm quality || exit /b 1
call docker compose run --build --rm desktop-test sh -lc "find node_modules frontend/node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} + && npm ci && npm audit --audit-level=high"
exit /b %errorlevel%

:help
echo Usage:
echo   scripts\test-app.bat            Start the Docker frontend preview in the foreground
echo   scripts\test-app.bat --detach   Start the Docker frontend preview in the background
echo   scripts\test-app.bat --ps       Show Docker service status
echo   scripts\test-app.bat --logs     Follow Docker frontend logs
echo   scripts\test-app.bat --down     Stop Docker services
echo   scripts\test-app.bat --quality  Run quality gates and Docker desktop tests
exit /b 0

@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo  AI CREDIT RISK RESEARCH ^& DYNAMIC MONITORING PLATFORM LAUNCHER
echo ====================================================================

REM 1. Validate Prerequisites
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Cargo / Rust is not found in PATH!
    pause
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python 3 is not found in PATH!
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    pause
    exit /b 1
)

echo [OK] Prerequisite tools verified: Rust, Python, Node.js.

if not exist data mkdir data
if not exist .pids (
    type nul > .pids
)

REM 2. Launch Python ML Service (Port 8241)
echo Starting Python ML Service on http://127.0.0.1:8241...
start "Credit-Risk-ML-Service" /B python -m uvicorn app.main:app --host 127.0.0.1 --port 8241 --app-dir ml_service > ml_service.log 2>&1
ping 127.0.0.1 -n 2 >nul
for /f "tokens=*" %%a in ('powershell -Command "Get-Process -Name python -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1 -ExpandProperty Id"') do (
    set ML_PID=%%a
    echo !ML_PID! >> .pids
    echo [OK] ML Service process ID: !ML_PID!
)

REM 3. Launch Rust Backend (Port 8240)
echo Starting Rust Axum Backend on http://127.0.0.1:8240...
start "Credit-Risk-Rust-Backend" /B backend\target\debug\credit-risk-backend.exe > backend.log 2>&1
ping 127.0.0.1 -n 3 >nul
for /f "tokens=*" %%a in ('powershell -Command "Get-Process -Name credit-risk-backend -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1 -ExpandProperty Id"') do (
    set RUST_PID=%%a
    echo !RUST_PID! >> .pids
    echo [OK] Rust Backend process ID: !RUST_PID!
)

REM 4. Launch Frontend UI (Port 3240)
echo Starting Frontend UI on http://127.0.0.1:3240...
cd frontend
start "Credit-Risk-Frontend" /B node node_modules/vite/bin/vite.js --port 3240 --host 127.0.0.1 > ..\frontend.log 2>&1
cd ..
ping 127.0.0.1 -n 2 >nul
for /f "tokens=*" %%a in ('powershell -Command "Get-Process -Name node -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1 -ExpandProperty Id"') do (
    set NODE_PID=%%a
    echo !NODE_PID! >> .pids
    echo [OK] Frontend UI process ID: !NODE_PID!
)

echo.
echo ====================================================================
echo  SYSTEM SERVICES SUCCESSFULLY LAUNCHED
echo ====================================================================
echo  - Frontend Dashboard:    http://127.0.0.1:3240
echo  - Rust REST API:         http://127.0.0.1:8240
echo  - Python ML Service:     http://127.0.0.1:8241
echo  - Health Endpoint:       http://127.0.0.1:8240/api/health
echo  - Database:              SQLite (WAL Active) at ./data/credit_risk.db
echo  - Disclaimer:            SYNTHETIC ACADEMIC PROTOTYPE ONLY
echo.
echo  To stop all services gracefully, execute: stop.bat
echo ====================================================================

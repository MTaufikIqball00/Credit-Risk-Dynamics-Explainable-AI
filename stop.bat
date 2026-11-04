@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo  STOPPING AI CREDIT RISK PLATFORM SERVICES
echo ====================================================================

if not exist .pids (
    echo [INFO] No .pids file found. Releasing listening ports: 3240, 8240, 8241
    powershell -Command "Get-NetTCPConnection -LocalPort 3240, 8240, 8241 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; Write-Host ('Stopped process on port: ' + $_) }"
    echo All target platform ports released.
    exit /b 0
)

for /f "usebackq tokens=*" %%p in (".pids") do (
    set PID_VAL=%%p
    if not "!PID_VAL!"=="" (
        taskkill /F /PID !PID_VAL! >nul 2>nul
        if !errorlevel! equ 0 (
            echo [OK] Terminated project process ID: !PID_VAL!
        )
    )
)

del .pids >nul 2>nul
echo [OK] All project background processes stopped cleanly.
echo ====================================================================

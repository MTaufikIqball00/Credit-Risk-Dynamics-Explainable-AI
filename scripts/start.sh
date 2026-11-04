#!/usr/bin/env bash
set -e

echo "===================================================================="
echo " AI CREDIT RISK RESEARCH & DYNAMIC MONITORING PLATFORM LAUNCHER"
echo "===================================================================="

# Check prerequisites
command -v cargo >/dev/null 2>&1 || { echo >&2 "[ERROR] cargo is required but not installed."; exit 1; }
command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1 || { echo >&2 "[ERROR] python is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "[ERROR] node is required but not installed."; exit 1; }

PYTHON_CMD="python"
command -v python3 >/dev/null 2>&1 && PYTHON_CMD="python3"

mkdir -p data
> .pids

# 1. Start Python ML Service (Port 8241)
echo "Starting Python ML Service on http://127.0.0.1:8241..."
$PYTHON_CMD -m uvicorn app.main:app --host 127.0.0.1 --port 8241 --app-dir ml_service > ml_service.log 2>&1 &
ML_PID=$!
echo $ML_PID >> .pids
echo "[OK] ML Service running with PID $ML_PID"

# 2. Start Rust Axum Backend (Port 8240)
echo "Starting Rust Backend on http://127.0.0.1:8240..."
cargo run --manifest-path backend/Cargo.toml > backend.log 2>&1 &
RUST_PID=$!
echo $RUST_PID >> .pids
echo "[OK] Rust Backend running with PID $RUST_PID"

# 3. Start Frontend UI (Port 3240)
echo "Starting Frontend UI on http://127.0.0.1:3240..."
cd frontend
node node_modules/vite/bin/vite.js --port 3240 --host 127.0.0.1 > ../frontend.log 2>&1 &
FRONT_PID=$!
cd ..
echo $FRONT_PID >> .pids
echo "[OK] Frontend UI running with PID $FRONT_PID"

echo ""
echo "===================================================================="
echo " SYSTEM SERVICES RUNNING IN BACKGROUND"
echo "===================================================================="
echo " - Frontend Dashboard:    http://127.0.0.1:3240"
echo " - Rust REST API:         http://127.0.0.1:8240"
echo " - Python ML Service:     http://127.0.0.1:8241"
echo " - Health Verification:   http://127.0.0.1:8240/api/health"
echo " - Database:              SQLite (WAL Active) at ./data/credit_risk.db"
echo ""
echo " To stop services, execute: ./scripts/stop.sh"
echo "===================================================================="

#!/usr/bin/env bash

echo "===================================================================="
echo " STOPPING AI CREDIT RISK PLATFORM SERVICES"
echo "===================================================================="

if [ -f .pids ]; then
    while read -r pid; do
        if [ -n "$pid" ]; then
            kill "$pid" 2>/dev/null && echo "[OK] Killed project process $pid" || true
        fi
    done < .pids
    rm -f .pids
    echo "[OK] All recorded processes stopped."
else
    echo "[INFO] No .pids file found."
fi

echo "===================================================================="

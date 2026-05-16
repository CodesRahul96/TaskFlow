#!/bin/bash

echo "============================================"
echo "  TASKFLOW: Auto-Restarting All Services"
echo "============================================"

echo "[1/2] Clearing ports 5000 (Backend) and 5173 (Frontend)..."
# Try fuser first, fallback to lsof
fuser -k 5000/tcp 2>/dev/null || lsof -t -i:5000 | xargs -r kill -9 2>/dev/null
fuser -k 5173/tcp 2>/dev/null || lsof -t -i:5173 | xargs -r kill -9 2>/dev/null

echo "[2/2] Starting Services..."

# Start backend in the background
echo "Starting backend..."
cd backend || exit
npm run dev &
BACKEND_PID=$!

# Start frontend in the background
echo "Starting frontend..."
cd ../frontend || exit
npm run dev &
FRONTEND_PID=$!

cd ..

echo "--------------------------------------------"
echo "All services started! (Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID)"
echo "Press Ctrl+C to stop both services."
echo "--------------------------------------------"

# Trap Ctrl+C (SIGINT) and SIGTERM to kill both background processes
trap "echo -e '\nStopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait indefinitely to keep the script running and outputting logs
wait $BACKEND_PID $FRONTEND_PID

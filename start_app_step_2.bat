@echo off
echo ============================================
echo   TASKFLOW: Auto-Restarting All Services
echo ============================================

echo [1/3] Killing existing processes (Node, Nodemon)...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM nodemon.exe /T 2>nul

echo [2/3] Force-clearing port 5000 (Backend) and 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %%a 2>nul

echo [3/3] Starting Services...
start "TASKFLOW Server" cmd /k "cd backend && npm run dev"
start "TASKFLOW Client" cmd /k "cd frontend && npm run dev"

echo --------------------------------------------
echo All services restarted!
echo --------------------------------------------

echo Application started! Happy coding.

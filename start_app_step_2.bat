@echo off
echo Starting TASKFLOW Server...
start "TASKFLOW Server" cmd /k "cd backend && npm run dev"

echo Starting TASKFLOW Client...
start "TASKFLOW Client" cmd /k "cd frontend && npm run dev"

echo Application started! Happy coding.

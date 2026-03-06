@echo off
echo "=== TaskFlow Setup ==="

echo "→ Installing backend dependencies..."
start "TASKFLOW Server" cmd /k "cd backend && npm install"

cd backend && npm install && cd ..

echo "→ Installing frontend dependencies..."
start "TASKFLOW Client" cmd /k "cd frontend && npm install"

echo ""
echo "✅ Setup complete!"
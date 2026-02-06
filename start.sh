#!/bin/bash

# Ekrixi AI - Quick Start Script

echo "🚀 Ekrixi AI Quick Start"
echo "========================"
echo ""

# Check if backend should be started
read -p "Do you want to use the backend proxy? (y/n): " use_backend

if [ "$use_backend" = "y" ] || [ "$use_backend" = "Y" ]; then
    echo ""
    echo "📦 Setting up backend..."
    
    # Check if backend .env exists
    if [ ! -f "backend/.env" ]; then
        echo "⚠️  Backend .env file not found"
        read -p "Enter your Gemini API key: " api_key
        
        cat > backend/.env << EOF
GEMINI_API_KEY=$api_key
PORT=8080
FRONTEND_URL=http://localhost:3000
EOF
        echo "✅ Created backend/.env"
    fi
    
    # Install backend dependencies if needed
    if [ ! -d "backend/node_modules" ]; then
        echo "📥 Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    # Create frontend .env.local with backend URL
    echo "VITE_BACKEND_URL=http://localhost:8080" > .env.local
    echo "✅ Configured frontend to use backend proxy"
    
    # Start backend in background
    echo "🔧 Starting backend server..."
    cd backend && npm run dev &
    BACKEND_PID=$!
    cd ..
    
    echo "✅ Backend running on http://localhost:8080 (PID: $BACKEND_PID)"
else
    echo ""
    echo "ℹ️  Running without backend proxy"
    echo "   Users will be prompted to enter their own API key"
    
    # Clear backend URL from .env.local
    if [ -f ".env.local" ]; then
        sed -i '' '/VITE_BACKEND_URL/d' .env.local 2>/dev/null || true
    fi
fi

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

echo ""
echo "🎨 Starting frontend..."
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT

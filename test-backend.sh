#!/bin/bash

echo "🧪 Testing Ekrixi AI Backend Locally"
echo "===================================="
echo ""

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "❌ Error: backend/.env not found"
    echo "Please create backend/.env with your GEMINI_API_KEY"
    exit 1
fi

echo "✅ Backend configured"
echo ""
echo "🚀 Starting backend server on http://localhost:8080"
echo "   Press Ctrl+C to stop"
echo ""

cd backend && npm run dev

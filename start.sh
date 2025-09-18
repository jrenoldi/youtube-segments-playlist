#!/bin/bash

# YouTube Segments Playlist - Development Server Launcher
# This script provides multiple options to serve the application

echo "🎬 YouTube Segments Playlist - Development Server"
echo "=================================================="
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to find an available port
find_available_port() {
    local port=$1
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Check for Node.js and npm
if command_exists node && command_exists npm; then
    echo "✅ Node.js detected"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Find available port starting from 3000
    PORT=$(find_available_port 3000)
    
    echo "🚀 Starting Node.js server on port $PORT..."
    echo "🌐 Open http://localhost:$PORT in your browser"
    echo ""
    
    PORT=$PORT node server.js
    
# Check for Python 3
elif command_exists python3; then
    echo "✅ Python 3 detected"
    
    # Find available port starting from 8080
    PORT=$(find_available_port 8080)
    
    echo "🚀 Starting Python HTTP server on port $PORT..."
    echo "🌐 Open http://localhost:$PORT in your browser"
    echo ""
    
    python3 -m http.server $PORT
    
# Check for Python 2
elif command_exists python; then
    echo "✅ Python 2 detected"
    
    # Find available port starting from 8080
    PORT=$(find_available_port 8080)
    
    echo "🚀 Starting Python HTTP server on port $PORT..."
    echo "🌐 Open http://localhost:$PORT in your browser"
    echo ""
    
    python -m SimpleHTTPServer $PORT
    
else
    echo "❌ No suitable server found!"
    echo ""
    echo "Please install one of the following:"
    echo "  • Node.js (recommended): https://nodejs.org/"
    echo "  • Python 3: https://python.org/"
    echo ""
    echo "Alternative options:"
    echo "  • Use VS Code Live Server extension"
    echo "  • Use any other local development server"
    echo "  • Deploy to a web hosting service"
fi

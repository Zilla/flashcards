#!/bin/bash

# Set terminal title
echo -ne "\033]0;Antigravity Flashcards Launcher\007"

echo "======================================="
echo "     Antigravity Flashcards Launcher"
echo "======================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in your PATH."
    echo "Please install Node.js version 18 or newer to run this application."
    echo "Get it from: https://nodejs.org/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if node_modules folder exists
if [ ! -d "node_modules" ]; then
    echo "First-time setup: installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Failed to install dependencies. Please check your internet connection."
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

echo "Starting backend and frontend servers..."
echo "To stop the application, close this terminal window or press Ctrl+C."
echo ""
echo "Opening http://localhost:5173 in your default browser..."

# Open the browser dynamically based on the OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:5173" &>/dev/null &
elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "freebsd"* ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173" &>/dev/null &
    elif command -v sensible-browser &> /dev/null; then
        sensible-browser "http://localhost:5173" &>/dev/null &
    fi
fi

echo ""
npm run dev

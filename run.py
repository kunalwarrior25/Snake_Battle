#!/usr/bin/env python3
"""
Snake Battle - Main Runner
This file runs both backend and frontend services
"""

import subprocess
import sys
import os
import webbrowser
from threading import Thread
import time

def run_backend():
    """Run Flask backend server"""
    print("🐍 Starting Flask Backend...")
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    
    # Activate virtual environment if it exists
    venv_python = os.path.join(backend_dir, 'venv', 'Scripts' if sys.platform == 'win32' else 'bin', 'python')
    python_cmd = venv_python if os.path.exists(venv_python) else 'python'
    
    subprocess.run([python_cmd, 'app.py'], cwd=backend_dir)

def run_frontend():
    """Run Vite frontend development server"""
    print("⚡ Starting Vite Frontend...")
    
    # Wait for backend to start
    time.sleep(2)
    
    # Check if node_modules exists
    if not os.path.exists('node_modules'):
        print("📦 Installing npm dependencies...")
        subprocess.run(['npm', 'install'])
    
    # Start Vite dev server
    subprocess.run(['npm', 'run', 'dev'])

def open_browser():
    """Open browser after servers start"""
    time.sleep(5)  # Wait for servers to fully start
    webbrowser.open('http://localhost:5173')

def main():
    print("""
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║         🐍 SNAKE BATTLE 🐍           ║
    ║                                       ║
    ║      You Can't Complete This!         ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    """)
    
    print("\n📋 Starting services...\n")
    
    # Start backend in a separate thread
    backend_thread = Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # Open browser after delay
    browser_thread = Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Run frontend in main thread
    try:
        run_frontend()
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down servers...")
        print("✅ See you later!")
        sys.exit(0)

if __name__ == '__main__':
    main()
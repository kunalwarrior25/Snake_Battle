#!/usr/bin/env bash
# exit on error
set -o errexit

# Build Frontend
echo "Building Frontend..."
npm install
npm run build

# Install Backend
echo "Installing Backend..."
pip install -r backend/requirements.txt
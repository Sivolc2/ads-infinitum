#!/bin/bash
# Setup script for Freelancer API test scripts

echo "=========================================="
echo "Freelancer API Test Scripts Setup"
echo "=========================================="
echo

# Check Python version
echo "Checking Python version..."
python3 --version

if [ $? -ne 0 ]; then
    echo "❌ Python 3 is not installed. Please install Python 3.6 or higher."
    exit 1
fi

echo "✓ Python 3 found"
echo

# Install requirements
echo "Installing required packages..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo
echo "Next steps:"
echo "1. Ensure your .env file has the correct credentials"
echo "2. Run: python3 test_api_basic.py"
echo "3. Check README.md for more information"
echo
echo "For OAuth2 setup, run: python3 oauth2_flow.py"
echo "=========================================="

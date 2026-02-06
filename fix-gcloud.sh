#!/bin/bash

# Fix gcloud Python version issue

echo "🔧 Fixing gcloud Python compatibility..."
echo ""

# Find available Python versions
echo "Available Python versions:"
ls -la /opt/homebrew/opt/ | grep python

echo ""
echo "Current Python version:"
python3 --version

echo ""
echo "To fix gcloud, you have two options:"
echo ""
echo "Option 1: Install Python 3.12 (compatible with gcloud)"
echo "  brew install python@3.12"
echo "  export CLOUDSDK_PYTHON=/opt/homebrew/opt/python@3.12/bin/python3"
echo "  brew reinstall --cask google-cloud-sdk"
echo ""
echo "Option 2: Use Google Cloud Console (Web UI) - RECOMMENDED"
echo "  No installation needed!"
echo "  See DEPLOY_WEB_CONSOLE.md for step-by-step guide"
echo ""
echo "Option 3: Download gcloud installer directly"
echo "  curl https://sdk.cloud.google.com | bash"
echo "  exec -l \$SHELL"
echo ""

read -p "Which option would you like? (1/2/3): " choice

case $choice in
  1)
    echo "Installing Python 3.12..."
    brew install python@3.12
    export CLOUDSDK_PYTHON=/opt/homebrew/opt/python@3.12/bin/python3
    echo "Reinstalling gcloud..."
    brew reinstall --cask google-cloud-sdk
    ;;
  2)
    echo "Opening deployment guide..."
    open DEPLOY_WEB_CONSOLE.md
    ;;
  3)
    echo "Downloading gcloud installer..."
    curl https://sdk.cloud.google.com | bash
    echo ""
    echo "Restart your terminal and run: gcloud init"
    ;;
  *)
    echo "Invalid choice. Please run this script again."
    ;;
esac

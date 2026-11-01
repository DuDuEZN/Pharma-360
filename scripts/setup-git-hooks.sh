#!/bin/bash
# Script to setup git hooks for Pharma-360 project
# This script should be run by each developer after cloning the repository

set -e

echo "🚀 Setting up Git hooks for Pharma-360..."

# Get the repository root
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-commit hook
echo "📄 Installing pre-commit hook..."
cat > .git/hooks/pre-commit << 'PRE_COMMIT_EOF'
#!/bin/sh
# Pre-commit hook for Pharma-360
# Automatically format Python code with black and isort before commit

set -e

echo "🔧 Running pre-commit hooks for Pharma-360..."

# Use the Python from the environment
PYTHON_CMD="python"

# Check if python3 is available if python doesn't work
if ! command -v python &> /dev/null; then
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    else
        echo "❌ Neither python nor python3 found. Skipping formatting."
        exit 0
    fi
fi

# Get the repository root
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Format backend
if [ -d "backend" ]; then
    echo "📁 Formatting backend/ with black..."
    $PYTHON_CMD -m black backend/ 2>/dev/null || true
    echo "📁 Sorting imports in backend/ with isort..."
    $PYTHON_CMD -m isort backend/ 2>/dev/null || true
fi

# Format ia
if [ -d "ia" ]; then
    echo "📁 Formatting ia/ with black..."
    $PYTHON_CMD -m black ia/ 2>/dev/null || true
    echo "📁 Sorting imports in ia/ with isort..."
    $PYTHON_CMD -m isort ia/ 2>/dev/null || true
fi

# Add formatted files to staging
echo "📝 Adding formatted files to staging..."
git add -A

echo "✅ Pre-commit hooks completed successfully!"
exit 0
PRE_COMMIT_EOF

# Make pre-commit hook executable
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo ""
echo "💡 To use the pre-commit hook, make sure you have:"
echo "   - Python 3.11+ installed"
echo "   - black and isort installed (pip install black isort)"
echo ""
echo "📚 The hook will automatically format your code before each commit."

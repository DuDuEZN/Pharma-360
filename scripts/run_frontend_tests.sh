#!/bin/bash

# Script to run frontend tests
cd /workspace/github__DuDuEZN__Pharma-360/frontend

echo "=========================================="
echo "Running Frontend Production Tests"
echo "=========================================="
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found"
    exit 1
fi

# Install @tanstack/react-query if needed
if ! npm list @tanstack/react-query &> /dev/null; then
    echo "Installing @tanstack/react-query..."
    npm install @tanstack/react-query --save-dev
fi

# Run the production tests
echo "Running production page tests..."
npx vitest run tests/test_production_pages.test.jsx --config vitest.config.production.js 2>&1

echo ""
echo "=========================================="
echo "Tests completed"
echo "=========================================="

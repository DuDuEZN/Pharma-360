#!/bin/bash

# ===========================================
# Production Test Script for Pharma-360
# Run all production tests
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  Pharma-360 Production Test Suite${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Test functions
run_python_tests() {
    echo -e "${BLUE}Running Python production tests...${NC}"
    cd "$PROJECT_ROOT"
    if [ -f "scripts/test_production_issues.py" ]; then
        python3 scripts/test_production_issues.py
    else
        echo -e "${YELLOW}Python test script not found${NC}"
    fi
}

run_frontend_tests() {
    echo -e "\n${BLUE}Running Frontend production tests...${NC}"
    cd "$PROJECT_ROOT/frontend"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        echo -e "${YELLOW}npm not found, skipping frontend tests${NC}"
        return
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        npm install
    fi
    
    # Run production tests
    if [ -f "tests/test_production_pages.test.jsx" ]; then
        echo -e "${BLUE}Running production page tests...${NC}"
        npx vitest run tests/test_production_pages.test.jsx --config vitest.config.production.js
    else
        echo -e "${YELLOW}Production page tests not found${NC}"
    fi
}

run_docker_tests() {
    echo -e "\n${BLUE}Running Docker tests...${NC}"
    cd "$PROJECT_ROOT"
    
    # Check if docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker not found, skipping Docker tests${NC}"
        return
    fi
    
    # Check if containers are running
    echo -e "${BLUE}Checking Docker containers...${NC}"
    docker ps -a | grep pharma360 || echo -e "${YELLOW}No Pharma-360 containers running${NC}"
}

run_integration_tests() {
    echo -e "\n${BLUE}Running Integration tests...${NC}"
    cd "$PROJECT_ROOT"
    
    # Check if backend is running
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is running and healthy${NC}"
    else
        echo -e "${YELLOW}Backend is not running or not healthy${NC}"
    fi
    
    # Check if frontend is running
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}Frontend is running${NC}"
    else
        echo -e "${YELLOW}Frontend is not running${NC}"
    fi
}

# Main execution
main() {
    print_header
    
    # Run all tests
    run_python_tests
    run_frontend_tests
    run_docker_tests
    run_integration_tests
    
    echo -e "\n${GREEN}All production tests completed!${NC}\n"
}

# Run main
main "$@"

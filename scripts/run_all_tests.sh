#!/bin/bash

# Pharma-360 - Run All Tests Script
# QA-002: Improve test coverage
# This script runs all tests (backend, frontend, production) and generates reports

set -e

echo "=========================================="
echo "🚀 PHARMA-360 - RUN ALL TESTS"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_ROOT"

# Create reports directory
REPORTS_DIR="$PROJECT_ROOT/reports/tests"
mkdir -p "$REPORTS_DIR"

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="$REPORTS_DIR/test_report_$TIMESTAMP.md"

# Initialize report
echo "# 📊 Pharma-360 - Complete Test Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Generated**: $TIMESTAMP" >> "$REPORT_FILE"
echo "**Status**: Running..." >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Function to log and write to report
log_and_write() {
    echo -e "$1"
    echo "$1" | sed 's/\x1b\[[0-9;]*m//g' >> "$REPORT_FILE"
}

# Function to run a test section
run_test_section() {
    local section_name=$1
    local command=$2
    local directory=$3
    
    log_and_write ""
    log_and_write "## 🔍 $section_name"
    log_and_write ""
    
    cd "$directory"
    
    if eval "$command" 2>&1; then
        log_and_write "✅ ${GREEN}$section_name - PASSED${NC}"
        return 0
    else
        log_and_write "❌ ${RED}$section_name - FAILED${NC}"
        return 1
    fi
}

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log_and_write "---"

# 1. Backend Tests (PR #47)
log_and_write ""
log_and_write "${BLUE}=== BACKEND TESTS (PR #47) ===${NC}"
log_and_write ""

if [ -d "backend" ]; then
    cd backend
    
    # Run E2E functional tests
    log_and_write "### Running E2E Functional Tests..."
    if python -m pytest tests/test_e2e_functional.py -v --tb=short 2>&1 | tee -a "$REPORT_FILE"; then
        PASSED=$((PASSED + 1))
        log_and_write "✅ Backend E2E Functional Tests - PASSED"
    else
        FAILED=$((FAILED + 1))
        log_and_write "❌ Backend E2E Functional Tests - FAILED"
    fi
    TOTAL=$((TOTAL + 1))
    
    # Run deployment tests
    log_and_write ""
    log_and_write "### Running Deployment Tests..."
    if python -m pytest tests/test_deployment.py -v --tb=short 2>&1 | tee -a "$REPORT_FILE"; then
        PASSED=$((PASSED + 1))
        log_and_write "✅ Backend Deployment Tests - PASSED"
    else
        FAILED=$((FAILED + 1))
        log_and_write "❌ Backend Deployment Tests - FAILED"
    fi
    TOTAL=$((TOTAL + 1))
    
    cd ..
else
    log_and_write "⚠️  Backend directory not found"
fi

# 2. Frontend Tests (PR #47)
log_and_write ""
log_and_write "${BLUE}=== FRONTEND TESTS (PR #47) ===${NC}"
log_and_write ""

if [ -d "frontend" ]; then
    cd frontend
    
    # Run existing frontend tests
    log_and_write "### Running Existing Frontend Tests..."
    if npm test 2>&1 | tee -a "$REPORT_FILE"; then
        PASSED=$((PASSED + 1))
        log_and_write "✅ Frontend Tests - PASSED"
    else
        FAILED=$((FAILED + 1))
        log_and_write "❌ Frontend Tests - FAILED"
    fi
    TOTAL=$((TOTAL + 1))
    
    cd ..
else
    log_and_write "⚠️  Frontend directory not found"
fi

# 3. Production Tests (PR #48)
log_and_write ""
log_and_write "${BLUE}=== PRODUCTION TESTS (PR #48) ===${NC}"
log_and_write ""

# Python production tests
log_and_write "### Running Python Production Tests..."
if python3 scripts/test_production_issues.py 2>&1 | tee -a "$REPORT_FILE"; then
    PASSED=$((PASSED + 1))
    log_and_write "✅ Python Production Tests - PASSED"
else
    FAILED=$((FAILED + 1))
    log_and_write "❌ Python Production Tests - FAILED"
fi
TOTAL=$((TOTAL + 1))

# Frontend production tests
log_and_write ""
log_and_write "### Running Frontend Production Tests..."
cd frontend
if npx vitest run tests/test_production_pages.test.jsx --config vitest.config.production.js 2>&1 | tee -a "$REPORT_FILE"; then
    PASSED=$((PASSED + 1))
    log_and_write "✅ Frontend Production Tests - PASSED"
else
    FAILED=$((FAILED + 1))
    log_and_write "❌ Frontend Production Tests - FAILED"
fi
TOTAL=$((TOTAL + 1))
cd ..

# 4. Coverage Tests (QA-002)
log_and_write ""
log_and_write "${BLUE}=== COVERAGE TESTS (QA-002) ===${NC}"
log_and_write ""

log_and_write "### Running Coverage Report..."
if python3 scripts/test_coverage_report.py 2>&1 | tee -a "$REPORT_FILE"; then
    PASSED=$((PASSED + 1))
    log_and_write "✅ Coverage Report Generated - PASSED"
else
    FAILED=$((FAILED + 1))
    log_and_write "❌ Coverage Report - FAILED"
fi
TOTAL=$((TOTAL + 1))

# 5. Full Integration Tests
log_and_write ""
log_and_write "${BLUE}=== FULL INTEGRATION TESTS ===${NC}"
log_and_write ""

log_and_write "### Running Full Integration Test Script..."
if python3 scripts/test_full_integration.py 2>&1 | tee -a "$REPORT_FILE"; then
    PASSED=$((PASSED + 1))
    log_and_write "✅ Full Integration Tests - PASSED"
else
    FAILED=$((FAILED + 1))
    log_and_write "❌ Full Integration Tests - FAILED"
fi
TOTAL=$((TOTAL + 1))

# Generate Summary
log_and_write ""
log_and_write "---"
log_and_write ""
log_and_write "${BLUE}=== TEST SUMMARY ===${NC}"
log_and_write ""
log_and_write "| Metric | Value |"
log_and_write "|--------|-------|"
log_and_write "| Total Test Suites | $TOTAL |"
log_and_write "| Passed | $PASSED |"
log_and_write "| Failed | $FAILED |"
log_and_write "| Success Rate | $((PASSED * 100 / TOTAL))% |"
log_and_write ""

# Update report status
if [ $FAILED -eq 0 ]; then
    log_and_write "**Status**: ✅ ALL TESTS PASSED"
    sed -i "s/\*\*Status\*: Running.../\*\*Status\*: ✅ ALL TESTS PASSED/" "$REPORT_FILE"
    exit 0
else
    log_and_write "**Status**: ⚠️  SOME TESTS FAILED"
    sed -i "s/\*\*Status\*: Running.../\*\*Status\*: ⚠️ SOME TESTS FAILED/" "$REPORT_FILE"
    exit 1
fi

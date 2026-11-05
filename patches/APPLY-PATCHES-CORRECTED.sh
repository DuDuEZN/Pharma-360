#!/bin/bash

# ===========================================
# Pharma 360 - Apply All Correction Patches
# ===========================================
# This script applies all the correction patches
# in the correct order to fix all identified issues
# ===========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}=========================================="
echo "Pharma 360 - Applying Correction Patches"
echo "==========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/docker/docker-compose.yml" ]; then
    echo -e "${RED}ERROR: Not in the project root directory or docker/docker-compose.yml not found${NC}"
    echo "Please run this script from: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

# Array of patches to apply (in order)
PATCHES=(
    "patches/000-CORRECTED-fix-docker-compose-all-issues.patch"
    "patches/001-fix-backend-test_auth-fixture.patch"
    "patches/002-fix-frontend-migrate-to-vitest.patch"
    "patches/003-fix-create_test_data-db-host.patch"
    "patches/006-fix-backend-dockerfile-remove-build-essential.patch"
)

TOTAL_PATCHES=${#PATCHES[@]}
SUCCESS_COUNT=0
FAIL_COUNT=0

echo -e "${YELLOW}Checking patch files...${NC}"

# Verify all patch files exist
for patch in "${PATCHES[@]}"; do
    if [ ! -f "$patch" ]; then
        echo -e "${RED}ERROR: Patch file not found: $patch${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}Missing patch files. Please ensure all patches are present.${NC}"
    exit 1
fi

echo -e "${GREEN}All patch files found!${NC}"
echo ""

# Apply patches
echo -e "${YELLOW}Applying patches...${NC}"
echo ""

for i in "${!PATCHES[@]}"; do
    patch_file="${PATCHES[$i]}"
    patch_name=$(basename "$patch_file")
    
    echo -e "${BLUE}[$(printf "%02d" $((i+1)))/$TOTAL_PATCHES]${NC} Applying: $patch_name"
    
    if patch -p1 < "$patch_file" 2>&1; then
        echo -e "${GREEN}  ✓ Successfully applied: $patch_name${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}  ✗ Failed to apply: $patch_name${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
done

# Summary
echo -e "${BLUE}=========================================="
echo "Patch Application Summary"
echo "==========================================${NC}"
echo -e "Total patches: $TOTAL_PATCHES"
echo -e "${GREEN}Successfully applied: $SUCCESS_COUNT${NC}"
echo -e "${RED}Failed to apply: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}All patches applied successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Review changes: git diff"
    echo "  2. Rebuild containers: docker compose build --no-cache"
    echo "  3. Start containers: docker compose up -d"
    echo "  4. Check status: docker compose ps"
    echo ""
    exit 0
else
    echo -e "${RED}Some patches failed to apply.${NC}"
    echo -e "${YELLOW}Please check the errors above and apply manually if needed.${NC}"
    exit 1
fi

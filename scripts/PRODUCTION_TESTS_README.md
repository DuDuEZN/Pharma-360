# Pharma-360 Production Tests

## Overview

This directory contains comprehensive production tests for the Pharma-360 platform. These tests verify:

1. **Visual Integrity**: Each page renders correctly without 404 errors or blank pages
2. **Functional Integrity**: All interactive elements work as expected
3. **WebSocket Connectivity**: Real-time communication works in production
4. **API Endpoints**: All backend APIs are accessible
5. **Docker Configuration**: All containers start and communicate correctly

## Test Structure

### 1. Python Tests (`test_production_issues.py`)

Tests backend and infrastructure issues:
- Docker container health
- Backend API health
- WebSocket configuration
- Nginx configuration
- API endpoint accessibility

### 2. Frontend Tests (`frontend/tests/test_production_pages.test.jsx`)

Comprehensive visual and functional tests for all pages:

#### Page Rendering Tests
- Each page loads without errors
- Each page is not blank
- Each page displays expected content

#### Visual Regression Tests
- Consistent structure across pages
- Proper heading hierarchy
- Accessibility compliance

#### Functional Tests
- Form submissions work
- Navigation between pages works
- Interactive elements respond to user actions

#### Production-Specific Tests
- 404 page handling
- Blank page prevention
- WebSocket integration
- Responsive design
- Performance

## Running Tests

### Run All Production Tests

```bash
chmod +x scripts/test_production.sh
./scripts/test_production.sh
```

### Run Python Tests Only

```bash
python3 scripts/test_production_issues.py
```

### Run Frontend Tests Only

```bash
cd frontend
npm run test:production
```

Or manually:

```bash
npx vitest run tests/test_production_pages.test.jsx --config vitest.config.production.js
```

## Test Configuration

### Frontend Test Configuration

- **File**: `frontend/vitest.config.production.js`
- **Environment**: jsdom
- **Setup**: `frontend/tests/setup.production.js`
- **Coverage**: Enabled for all source files

### Mocked Dependencies

All external dependencies are mocked to ensure tests run offline:

- API calls (`@/services/api`)
- Authentication (`@/hooks/useAuth`)
- WebSocket (`@/hooks/useWebSocket`)
- Cart (`@/hooks/useCart`)
- Barcode Scanner (`@/hooks/useBarcodeScanner`)
- Alerts (`@/hooks/useAlerts`)
- Browser APIs (localStorage, sessionStorage, navigator, etc.)

## Production Issues Addressed

### 1. WebSocket Connection Errors

**Problem**: WebSocket connections failing in production

**Solution**:
- Added explicit WebSocket proxy configuration in nginx
- Added `/api/ws/` location block with proper WebSocket headers
- Disabled buffering for WebSocket connections
- Increased timeout for WebSocket connections
- Verified WebSocket URL construction in frontend

**Files Modified**:
- `docker/nginx/nginx.conf`
- Verified `frontend/src/hooks/useWebSocket.jsx`
- Verified `backend/api/websocket.py`
- Verified `backend/main.py`

### 2. 404 Errors on Pages

**Problem**: Some pages returning 404 errors

**Solution**:
- Added fallback configuration in nginx to serve static files directly
- Added `try_files $uri $uri/ /index.html;` for frontend routes
- Verified frontend build includes all pages
- Added error page handling in nginx

**Files Modified**:
- `docker/nginx/nginx.conf`
- Verified `frontend/vite.config.js`

### 3. Blank Pages

**Problem**: Some pages rendering as blank (white screen)

**Solution**:
- Verified all component exports are correct
- Verified all import paths use correct extensions
- Added comprehensive page rendering tests
- Added visual regression tests

**Files Modified**:
- Verified all frontend component files
- Created `frontend/tests/test_production_pages.test.jsx`

## Test Results

All tests generate reports in:
- `frontend/test-results/` - HTML and JSON test reports
- Console output - Detailed test results

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/production-tests.yml
name: Production Tests

on:
  push:
    branches: [main, feature/*]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Production Tests
        run: |
          chmod +x scripts/test_production.sh
          ./scripts/test_production.sh
```

## Troubleshooting

### Tests Failing

1. **Docker containers not running**:
   ```bash
   docker-compose up -d
   ```

2. **Frontend dependencies not installed**:
   ```bash
   cd frontend
   npm install
   ```

3. **Python dependencies not installed**:
   ```bash
   pip install -r backend/requirements.txt
   ```

### Common Issues

1. **Port conflicts**: Ensure ports 80, 8000, 8001, 3000, 5432 are available
2. **Missing environment variables**: Check `.env` files
3. **Build failures**: Run `npm run build` in frontend directory

## Contributing

To add new production tests:

1. Add test cases to `frontend/tests/test_production_pages.test.jsx`
2. Add infrastructure tests to `scripts/test_production_issues.py`
3. Update this README with new test categories

## License

This test suite is part of the Pharma-360 project and follows the same license.

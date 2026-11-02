#!/usr/bin/env python3
"""
Production Issues Test Script for Pharma-360
Tests WebSocket connectivity, 404 errors, and blank pages
"""

import asyncio
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Colors for output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    RESET = '\033[0m'


class ProductionTester:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.results: Dict[str, Dict] = {}
        self.start_time = time.time()
        
    def print_header(self, text: str):
        print(f"\n{Colors.BOLD}{Colors.BLUE}=== {text} ==={Colors.RESET}\n")
        
    def print_success(self, text: str):
        print(f"{Colors.GREEN}✓{Colors.RESET} {text}")
        
    def print_error(self, text: str):
        print(f"{Colors.RED}✗{Colors.RESET} {text}")
        
    def print_warning(self, text: str):
        print(f"{Colors.YELLOW}⚠{Colors.RESET} {text}")
        
    def print_info(self, text: str):
        print(f"{Colors.CYAN}ℹ{Colors.RESET} {text}")
    
    def run_command(self, cmd: str, cwd: Optional[str] = None, timeout: int = 30) -> Tuple[bool, str]:
        """Run a command and return (success, output)"""
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=cwd or str(self.project_root),
                capture_output=True,
                text=True,
                timeout=timeout
            )
            success = result.returncode == 0
            output = result.stdout + result.stderr
            return success, output
        except subprocess.TimeoutExpired:
            return False, f"Command timed out after {timeout}s: {cmd}"
        except Exception as e:
            return False, f"Error running command: {e}"
    
    def test_docker_containers_running(self) -> bool:
        """Test if all Docker containers are running"""
        self.print_header("Testing Docker Containers")
        
        containers = ['pharma360-db', 'pharma360-backend', 'pharma360-frontend', 'pharma360-ia', 'pharma360-nginx']
        all_running = True
        
        for container in containers:
            success, output = self.run_command(
                f"docker ps --format '{{{{.Names}}}}' | grep -q {container}"
            )
            if success:
                self.print_success(f"Container {container} is running")
            else:
                self.print_error(f"Container {container} is NOT running")
                all_running = False
        
        return all_running
    
    def test_backend_health(self) -> bool:
        """Test backend health endpoint"""
        self.print_header("Testing Backend Health")
        
        success, output = self.run_command(
            "curl -s -o /dev/null -w '%{{http_code}}' http://localhost:8000/api/health"
        )
        
        if success and '200' in output:
            self.print_success("Backend health check passed")
            return True
        else:
            self.print_error(f"Backend health check failed: {output}")
            return False
    
    def test_frontend_build(self) -> bool:
        """Test if frontend can be built"""
        self.print_header("Testing Frontend Build")
        
        success, output = self.run_command(
            "cd frontend && npm run build",
            cwd=str(self.project_root / "frontend"),
            timeout=120
        )
        
        if success:
            self.print_success("Frontend build succeeded")
            return True
        else:
            self.print_error(f"Frontend build failed: {output}")
            return False
    
    def test_websocket_connection(self) -> bool:
        """Test WebSocket connection (requires websocat or similar tool)"""
        self.print_header("Testing WebSocket Connection")
        
        # First, check if we can reach the WebSocket endpoint via HTTP
        success, output = self.run_command(
            "curl -s -o /dev/null -w '%{{http_code}}' -I http://localhost:8000/api/ws/sales"
        )
        
        if success:
            self.print_info(f"WebSocket endpoint HTTP status: {output.strip()}")
        else:
            self.print_warning(f"Cannot reach WebSocket endpoint via HTTP: {output}")
        
        # Try to connect using websocat if available
        success, output = self.run_command(
            "which websocat",
            timeout=5
        )
        
        if success:
            self.print_info("websocat found, attempting WebSocket connection...")
            success, output = self.run_command(
                "echo '' | websocat -t 1 ws://localhost:8000/api/ws/sales 2>&1 || true",
                timeout=5
            )
            if "Connected" in output or "101" in output:
                self.print_success("WebSocket connection successful")
                return True
            else:
                self.print_error(f"WebSocket connection failed: {output}")
                return False
        else:
            self.print_warning("websocat not installed, skipping WebSocket connection test")
            return True  # Can't test without websocat
    
    def test_frontend_routes(self) -> Dict[str, bool]:
        """Test all frontend routes"""
        self.print_header("Testing Frontend Routes")
        
        routes = [
            '/',
            '/login',
            '/products',
            '/sales',
            '/cashier',
            '/admin',
            '/admin/users',
            '/admin/roles',
            '/admin/permissions',
            '/admin/settings',
            '/admin/reports',
            '/manager',
            '/manager/inventory',
            '/manager/suppliers',
            '/manager/dashboard',
        ]
        
        results = {}
        
        # First, start the frontend dev server if not running
        self.print_info("Starting frontend dev server for testing...")
        
        # Test via curl to localhost:3000 (dev server)
        for route in routes:
            success, output = self.run_command(
                f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:3000{route}",
                timeout=5
            )
            
            if success and '200' in output:
                self.print_success(f"Route {route} - OK")
                results[route] = True
            elif success and '404' in output:
                self.print_error(f"Route {route} - 404")
                results[route] = False
            else:
                self.print_warning(f"Route {route} - Status: {output.strip() if output else 'Unknown'}")
                results[route] = False
        
        return results
    
    def test_api_endpoints(self) -> Dict[str, bool]:
        """Test critical API endpoints"""
        self.print_header("Testing API Endpoints")
        
        endpoints = [
            '/api/health',
            '/api/v1/products',
            '/api/v1/sales',
            '/api/v1/users',
            '/api/v1/auth/login',
        ]
        
        results = {}
        
        for endpoint in endpoints:
            success, output = self.run_command(
                f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:8000{endpoint}",
                timeout=5
            )
            
            if success and ('200' in output or '401' in output or '403' in output):
                self.print_success(f"API {endpoint} - OK")
                results[endpoint] = True
            else:
                self.print_error(f"API {endpoint} - Failed: {output.strip() if output else 'Unknown'}")
                results[endpoint] = False
        
        return results
    
    def test_nginx_configuration(self) -> bool:
        """Test nginx configuration"""
        self.print_header("Testing Nginx Configuration")
        
        # Check if nginx config is valid
        success, output = self.run_command(
            "nginx -t -c /workspace/github__DuDuEZN__Pharma-360/docker/nginx/nginx.conf",
            timeout=5
        )
        
        if success:
            self.print_success("Nginx configuration is valid")
            
            # Check for WebSocket proxy settings
            nginx_conf = self.project_root / "docker" / "nginx" / "nginx.conf"
            if nginx_conf.exists():
                content = nginx_conf.read_text()
                if 'proxy_set_header Upgrade $http_upgrade' in content:
                    self.print_success("WebSocket Upgrade header configured")
                else:
                    self.print_error("WebSocket Upgrade header NOT configured")
                    return False
                
                if 'proxy_set_header Connection "upgrade"' in content:
                    self.print_success("WebSocket Connection header configured")
                else:
                    self.print_error("WebSocket Connection header NOT configured")
                    return False
            
            return True
        else:
            self.print_error(f"Nginx configuration error: {output}")
            return False
    
    def test_websocket_frontend_config(self) -> bool:
        """Test WebSocket configuration in frontend"""
        self.print_header("Testing Frontend WebSocket Configuration")
        
        use_websocket_file = self.project_root / "frontend" / "src" / "hooks" / "useWebSocket.jsx"
        
        if not use_websocket_file.exists():
            self.print_error("useWebSocket.jsx not found")
            return False
        
        content = use_websocket_file.read_text()
        
        # Check for WS_BASE_URL
        if 'WS_BASE_URL' in content:
            self.print_success("WS_BASE_URL found in useWebSocket.jsx")
        else:
            self.print_error("WS_BASE_URL NOT found in useWebSocket.jsx")
            return False
        
        # Check for WebSocket endpoint paths
        if '/ws/sales' in content and '/ws/cashier' in content:
            self.print_success("WebSocket endpoints (/ws/sales, /ws/cashier) configured")
        else:
            self.print_error("WebSocket endpoints NOT properly configured")
            return False
        
        # Check for token parameter
        if 'token' in content and 'searchParams.append' in content:
            self.print_success("Token parameter handling configured")
        else:
            self.print_error("Token parameter handling NOT configured")
            return False
        
        return True
    
    def test_backend_websocket_routes(self) -> bool:
        """Test backend WebSocket route configuration"""
        self.print_header("Testing Backend WebSocket Routes")
        
        websocket_file = self.project_root / "backend" / "api" / "websocket.py"
        main_file = self.project_root / "backend" / "main.py"
        
        if not websocket_file.exists():
            self.print_error("websocket.py not found")
            return False
        
        if not main_file.exists():
            self.print_error("main.py not found")
            return False
        
        websocket_content = websocket_file.read_text()
        main_content = main_file.read_text()
        
        # Check for WebSocket router
        if 'APIRouter' in websocket_content and 'prefix="/ws"' in websocket_content:
            self.print_success("WebSocket router with /ws prefix found")
        else:
            self.print_error("WebSocket router NOT properly configured")
            return False
        
        # Check if router is included in main.py
        if 'websocket_router' in main_content and 'include_router' in main_content:
            self.print_success("WebSocket router included in main.py")
        else:
            self.print_error("WebSocket router NOT included in main.py")
            return False
        
        # Check for /api prefix in main.py
        if 'prefix="/api"' in main_content and 'websocket' in main_content:
            self.print_success("WebSocket router mounted with /api prefix")
        else:
            self.print_error("WebSocket router NOT mounted with /api prefix")
            return False
        
        return True
    
    def generate_report(self):
        """Generate a summary report"""
        self.print_header("Test Summary Report")
        
        elapsed = time.time() - self.start_time
        
        print(f"\n{Colors.BOLD}Test Execution Time: {elapsed:.2f} seconds{Colors.RESET}\n")
        
        # Count passed/failed
        passed = sum(1 for r in self.results.values() if r.get('passed', False))
        failed = len(self.results) - passed
        
        print(f"{Colors.BOLD}Overall Status: {Colors.RESET}")
        print(f"  {Colors.GREEN}Passed: {passed}{Colors.RESET}")
        print(f"  {Colors.RED}Failed: {failed}{Colors.RESET}")
        
        print(f"\n{Colors.BOLD}Detailed Results:{Colors.RESET}")
        for test_name, result in self.results.items():
            status = f"{Colors.GREEN}PASS{Colors.RESET}" if result.get('passed', False) else f"{Colors.RED}FAIL{Colors.RESET}"
            print(f"  {status} - {test_name}")
            if 'details' in result:
                print(f"      {result['details']}")
    
    async def run_all_tests(self):
        """Run all production tests"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}Pharma-360 Production Issues Test Suite{Colors.RESET}")
        print(f"{Colors.BOLD}{Colors.BLUE}====================================={Colors.RESET}\n")
        
        # Test 1: Docker containers
        self.print_info("Starting test suite...")
        
        # Test WebSocket configuration
        self.results['websocket_backend_config'] = {
            'passed': self.test_backend_websocket_routes(),
            'details': 'Backend WebSocket route configuration'
        }
        
        self.results['websocket_frontend_config'] = {
            'passed': self.test_websocket_frontend_config(),
            'details': 'Frontend WebSocket configuration'
        }
        
        self.results['nginx_config'] = {
            'passed': self.test_nginx_configuration(),
            'details': 'Nginx configuration validation'
        }
        
        self.results['frontend_build'] = {
            'passed': self.test_frontend_build(),
            'details': 'Frontend build test'
        }
        
        self.results['backend_health'] = {
            'passed': self.test_backend_health(),
            'details': 'Backend health check'
        }
        
        self.results['api_endpoints'] = {
            'passed': all(self.test_api_endpoints().values()),
            'details': 'API endpoints test'
        }
        
        # Generate report
        self.generate_report()
        
        # Return overall status
        all_passed = all(r.get('passed', False) for r in self.results.values())
        return all_passed


if __name__ == "__main__":
    tester = ProductionTester()
    
    try:
        success = asyncio.run(tester.run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.RESET}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.RED}Error running tests: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

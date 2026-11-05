#!/usr/bin/env python3
"""
Deployment Test Script for Pharma 360
Tests all services and their connections
"""

import asyncio
import aiohttp
import sys
import os
from datetime import datetime
from typing import Dict, List, Tuple


class DeploymentTester:
    """Test deployment of all Pharma 360 services"""
    
    def __init__(self):
        self.base_urls = {
            "backend": os.getenv("BACKEND_URL", "http://localhost:8000"),
            "ia": os.getenv("IA_URL", "http://localhost:8001"),
            "frontend": os.getenv("FRONTEND_URL", "http://localhost:3000"),
        }
        self.results = []
        self.start_time = datetime.now()
    
    async def test_backend_health(self) -> Tuple[str, bool, str]:
        """Test backend health endpoint"""
        url = f"{self.base_urls['backend']}/api/health"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('status') == 'healthy':
                            return ("Backend Health", True, f"OK - {data.get('app', 'Unknown')}")
                        return ("Backend Health", False, f"Unexpected status: {data.get('status')}")
                    return ("Backend Health", False, f"Status code: {response.status}")
        except Exception as e:
            return ("Backend Health", False, f"Error: {str(e)}")
    
    async def test_backend_root(self) -> Tuple[str, bool, str]:
        """Test backend root endpoint"""
        url = f"{self.base_urls['backend']}/"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        return ("Backend Root", True, f"OK - {data.get('message', 'No message')}")
                    return ("Backend Root", False, f"Status code: {response.status}")
        except Exception as e:
            return ("Backend Root", False, f"Error: {str(e)}")
    
    async def test_ia_health(self) -> Tuple[str, bool, str]:
        """Test IA service health endpoint"""
        url = f"{self.base_urls['ia']}/api/health"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('status') == 'healthy':
                            return ("IA Health", True, f"OK - {data.get('service', 'Unknown')}")
                        return ("IA Health", False, f"Unexpected status: {data.get('status')}")
                    return ("IA Health", False, f"Status code: {response.status}")
        except Exception as e:
            return ("IA Health", False, f"Error: {str(e)}")
    
    async def test_ia_root(self) -> Tuple[str, bool, str]:
        """Test IA service root endpoint"""
        url = f"{self.base_urls['ia']}/"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        return ("IA Root", True, f"OK - {data.get('message', 'No message')}")
                    return ("IA Root", False, f"Status code: {response.status}")
        except Exception as e:
            return ("IA Root", False, f"Error: {str(e)}")
    
    async def test_ia_ocr_endpoint(self) -> Tuple[str, bool, str]:
        """Test IA OCR endpoint exists"""
        url = f"{self.base_urls['ia']}/api/v1/ocr/health"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        return ("IA OCR Endpoint", True, f"OK - OCR service available")
                    return ("IA OCR Endpoint", False, f"Status code: {response.status}")
        except Exception as e:
            return ("IA OCR Endpoint", False, f"Error: {str(e)}")
    
    async def test_ia_alerts_endpoint(self) -> Tuple[str, bool, str]:
        """Test IA Alerts endpoint"""
        url = f"{self.base_urls['ia']}/api/v1/alerts/"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        return ("IA Alerts Endpoint", True, "OK - Alerts endpoint available")
                    return ("IA Alerts Endpoint", False, f"Status code: {response.status}")
        except Exception as e:
            return ("IA Alerts Endpoint", False, f"Error: {str(e)}")
    
    async def test_ia_kpis_endpoint(self) -> Tuple[str, bool, str]:
        """Test IA KPIs endpoint"""
        url = f"{self.base_urls['ia']}/api/v1/kpis"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        return ("IA KPIs Endpoint", True, "OK - KPIs endpoint available")
                    return ("IA KPIs Endpoint", False, f"Status code: {response.status}")
        except Exception as e:
            return ("IA KPIs Endpoint", False, f"Error: {str(e)}")
    
    async def test_ia_dashboard_endpoint(self) -> Tuple[str, bool, str]:
        """Test IA Dashboard endpoint"""
        url = f"{self.base_urls['ia']}/api/v1/dashboard/"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        return ("IA Dashboard Endpoint", True, "OK - Dashboard endpoint available")
                    return ("IA Dashboard Endpoint", False, f"Status code: {response.status}")
        except Exception as e:
            return ("IA Dashboard Endpoint", False, f"Error: {str(e)}")
    
    async def test_frontend_health(self) -> Tuple[str, bool, str]:
        """Test frontend is accessible"""
        url = f"{self.base_urls['frontend']}/"
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        return ("Frontend", True, "OK - Frontend accessible")
                    return ("Frontend", False, f"Status code: {response.status}")
        except Exception as e:
            return ("Frontend", False, f"Error: {str(e)}")
    
    async def run_all_tests(self) -> List[Tuple[str, bool, str]]:
        """Run all deployment tests"""
        print("\n" + "="*60)
        print("Pharma 360 Deployment Test Suite")
        print("="*60)
        print(f"Started at: {self.start_time}")
        print()
        
        tests = [
            ("Backend Services", [
                self.test_backend_health,
                self.test_backend_root,
            ]),
            ("IA Services", [
                self.test_ia_health,
                self.test_ia_root,
                self.test_ia_ocr_endpoint,
                self.test_ia_alerts_endpoint,
                self.test_ia_kpis_endpoint,
                self.test_ia_dashboard_endpoint,
            ]),
            ("Frontend Services", [
                self.test_frontend_health,
            ]),
        ]
        
        for category, test_functions in tests:
            print(f"\n--- {category} ---")
            for test_func in test_functions:
                result = await test_func()
                self.results.append(result)
                status = "✓ PASS" if result[1] else "✗ FAIL"
                print(f"{status} - {result[0]}: {result[2]}")
        
        return self.results
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("Test Summary")
        print("="*60)
        
        total = len(self.results)
        passed = sum(1 for r in self.results if r[1])
        failed = total - passed
        
        print(f"Total tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        
        if failed > 0:
            print("\nFailed tests:")
            for test_name, passed, message in self.results:
                if not passed:
                    print(f"  - {test_name}: {message}")
        
        duration = datetime.now() - self.start_time
        print(f"\nDuration: {duration.total_seconds():.2f} seconds")
        print("="*60)
        
        if failed == 0:
            print("\n✓ All tests passed! Deployment is ready.")
            return 0
        else:
            print(f"\n✗ {failed} test(s) failed. Please fix the issues above.")
            return 1


async def main():
    """Main entry point"""
    tester = DeploymentTester()
    await tester.run_all_tests()
    exit_code = tester.print_summary()
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())

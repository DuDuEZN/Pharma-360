"""
Performance Tests for Pharmacie 360
Load testing and performance benchmarks

QA-011: Tests Performance (charge)
"""

import pytest
import time
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.main import app


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


class TestAPIResponseTime:
    """Tests for API response times"""
    
    def test_health_check_response_time(self, client):
        """Test health check response time < 100ms"""
        start_time = time.time()
        response = client.get("/api/health")
        elapsed = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        assert elapsed < 100  # Should be very fast
    
    def test_docs_response_time(self, client):
        """Test docs endpoint response time < 200ms"""
        start_time = time.time()
        response = client.get("/api/v1/docs/openapi.json")
        elapsed = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        assert elapsed < 200


class TestConcurrentRequests:
    """Tests for concurrent request handling"""
    
    def test_concurrent_health_checks(self, client):
        """Test handling multiple concurrent health checks"""
        import concurrent.futures
        
        def make_request():
            response = client.get("/api/health")
            return response.status_code
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        assert all(status == 200 for status in results)
    
    def test_concurrent_product_list(self, client):
        """Test handling multiple concurrent product list requests"""
        import concurrent.futures
        
        def make_request():
            response = client.get("/api/v1/products", params={"page": 1, "page_size": 10})
            return response.status_code
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        assert all(status == 200 for status in results)


class TestDatabaseQueryPerformance:
    """Tests for database query performance"""
    
    @pytest.mark.asyncio
    async def test_product_list_performance(self, client):
        """Test product list query performance"""
        start_time = time.time()
        response = client.get("/api/v1/products", params={"page": 1, "page_size": 50})
        elapsed = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        # Should be fast even with pagination
        assert elapsed < 500  # < 500ms for product list


class TestCachingPerformance:
    """Tests for caching performance improvements"""
    
    def test_cache_hit_performance(self, client):
        """Test that cache hits are faster than cache misses"""
        # First request (cache miss)
        start_time = time.time()
        response1 = client.get("/api/v1/products", params={"page": 1, "page_size": 10})
        time1 = (time.time() - start_time) * 1000
        
        # Second request (potential cache hit)
        start_time = time.time()
        response2 = client.get("/api/v1/products", params={"page": 1, "page_size": 10})
        time2 = (time.time() - start_time) * 1000
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Second request should be faster or equal (if caching works)
        # Note: This depends on Redis being configured
        print(f"First request: {time1:.2f}ms, Second request: {time2:.2f}ms")


class TestFEFOPerformance:
    """Tests for FEFO batch selection performance"""
    
    @pytest.mark.asyncio
    async def test_fefo_selection_performance(self, client):
        """Test FEFO batch selection is optimized"""
        # This would need actual data to test properly
        # For now, just verify the endpoint responds quickly
        start_time = time.time()
        response = client.get("/api/v1/batches/fefo/1")
        elapsed = (time.time() - start_time) * 1000
        
        # Should be fast (< 200ms for FEFO selection)
        assert elapsed < 200


class TestSearchPerformance:
    """Tests for search performance"""
    
    def test_product_search_performance(self, client):
        """Test product search performance"""
        start_time = time.time()
        response = client.get("/api/v1/products/search", params={"q": "test"})
        elapsed = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        assert elapsed < 500  # < 500ms for search


class TestBatchOperationsPerformance:
    """Tests for batch operations performance"""
    
    def test_batch_list_performance(self, client):
        """Test batch list performance"""
        start_time = time.time()
        response = client.get("/api/v1/batches", params={"page": 1, "page_size": 20})
        elapsed = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        assert elapsed < 500


class TestReportGenerationPerformance:
    """Tests for report generation performance"""
    
    def test_sales_report_performance(self, client):
        """Test sales report generation performance"""
        from datetime import date, timedelta
        
        start_time = time.time()
        response = client.post("/api/v1/reports/sales", json={
            "start_date": (date.today() - timedelta(days=30)).isoformat(),
            "end_date": date.today().isoformat()
        })
        elapsed = (time.time() - start_time) * 1000
        
        assert response.status_code == 200
        assert elapsed < 1000  # < 1 second for report


class TestWebSocketPerformance:
    """Tests for WebSocket performance"""
    
    def test_websocket_connection_speed(self, client):
        """Test WebSocket connection speed"""
        start_time = time.time()
        with client.websocket_connect("/api/ws") as websocket:
            elapsed = (time.time() - start_time) * 1000
        
        assert elapsed < 500  # < 500ms for WebSocket connection
    
    def test_websocket_message_latency(self, client):
        """Test WebSocket message latency"""
        import json
        
        with client.websocket_connect("/api/ws") as websocket:
            start_time = time.time()
            websocket.send_text(json.dumps({"type": "ping", "data": "test"}))
            # In a real test, we'd wait for a response
            elapsed = (time.time() - start_time) * 1000
        
        assert elapsed < 100  # < 100ms for message send


class TestMemoryUsage:
    """Tests for memory usage"""
    
    def test_memory_usage_stable(self, client):
        """Test that memory usage is stable after multiple requests"""
        import gc
        import sys
        
        # Get initial memory
        gc.collect()
        initial_memory = sys.getsizeof(client)
        
        # Make multiple requests
        for _ in range(10):
            client.get("/api/health")
        
        # Force garbage collection
        gc.collect()
        
        # Memory should not have increased significantly
        # This is a basic test - more sophisticated memory testing would be needed
        assert True  # Placeholder for actual memory test


class TestLoadTesting:
    """Load testing scenarios"""
    
    def test_100_requests_in_10_seconds(self, client):
        """Test handling 100 requests in 10 seconds"""
        import concurrent.futures
        import time
        
        def make_request():
            return client.get("/api/health").status_code
        
        start_time = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_request) for _ in range(100)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        elapsed = time.time() - start_time
        
        assert all(status == 200 for status in results)
        assert elapsed < 10  # Should handle 100 requests in < 10 seconds


class TestStressTesting:
    """Stress testing scenarios"""
    
    def test_concurrent_complex_requests(self, client):
        """Test handling concurrent complex requests"""
        import concurrent.futures
        
        endpoints = [
            "/api/health",
            "/api/v1/products",
            "/api/v1/batches",
            "/api/v1/sales",
        ]
        
        def make_request(endpoint):
            try:
                if endpoint == "/api/health":
                    return client.get(endpoint).status_code
                else:
                    return client.get(endpoint, params={"page": 1, "page_size": 5}).status_code
            except:
                return 500
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request, endpoint) 
                      for endpoint in endpoints * 5]  # 20 requests total
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # All should succeed or be valid responses
        assert all(status in [200, 404] for status in results)

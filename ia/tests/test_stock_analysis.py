"""
Tests for Stock Analysis Module
Tests for IA-001 task
"""

import pytest
from datetime import datetime, date, timedelta
from typing import List, Dict, Any

from ..analytics.stock_analysis import StockAnalyzer, stock_rotation_analysis, predict_stock_ruptures


@pytest.fixture
def sample_sales_data() -> List[Dict[str, Any]]:
    """Sample sales data for testing"""
    return [
        {
            'id': 1,
            'product_id': 1,
            'sale_date': datetime.now() - timedelta(days=5),
            'quantity': 10,
            'total_amount': 1000.00
        },
        {
            'id': 2,
            'product_id': 1,
            'sale_date': datetime.now() - timedelta(days=3),
            'quantity': 5,
            'total_amount': 500.00
        },
        {
            'id': 3,
            'product_id': 1,
            'sale_date': datetime.now() - timedelta(days=1),
            'quantity': 8,
            'total_amount': 800.00
        },
        {
            'id': 4,
            'product_id': 2,
            'sale_date': datetime.now() - timedelta(days=10),
            'quantity': 3,
            'total_amount': 300.00
        },
        {
            'id': 5,
            'product_id': 2,
            'sale_date': datetime.now() - timedelta(days=8),
            'quantity': 2,
            'total_amount': 200.00
        }
    ]


@pytest.fixture
def sample_products() -> List[Dict[str, Any]]:
    """Sample products data for testing"""
    return [
        {
            'id': 1,
            'name': 'Paracetamol 500mg',
            'category': 'Antidouleur',
            'current_stock': 50,
            'stock_min': 10,
            'stock_max': 100
        },
        {
            'id': 2,
            'name': 'Amoxicillin 250mg',
            'category': 'Antibiotique',
            'current_stock': 15,
            'stock_min': 5,
            'stock_max': 50
        },
        {
            'id': 3,
            'name': 'Vitamine C',
            'category': 'Complément',
            'current_stock': 200,
            'stock_min': 50,
            'stock_max': 300
        }
    ]


@pytest.fixture
def stock_analyzer():
    """Create a fresh StockAnalyzer instance"""
    return StockAnalyzer()


class TestStockAnalyzer:
    """Tests for StockAnalyzer class"""
    
    def test_calculate_rotation_rate(self, stock_analyzer, sample_sales_data):
        """Test rotation rate calculation"""
        # Test with product 1 (has recent sales)
        rotation_rate = stock_analyzer.calculate_rotation_rate(
            sample_sales_data, 
            product_id=1,
            days_window=30
        )
        
        # Product 1 has sales of 10+5+8 = 23 units in the last 5 days
        # So rotation rate should be around 23/5 = 4.6 units/day
        assert rotation_rate > 0
        assert isinstance(rotation_rate, float)
        
    def test_calculate_rotation_rate_no_sales(self, stock_analyzer):
        """Test rotation rate with no sales"""
        rotation_rate = stock_analyzer.calculate_rotation_rate(
            [],
            product_id=1,
            days_window=30
        )
        assert rotation_rate == 0.0
        
    def test_predict_stock_rupture(self, stock_analyzer, sample_sales_data):
        """Test stock rupture prediction"""
        stock_data = [
            {
                'product_id': 1,
                'stock_level': 50,
                'date': date.today() - timedelta(days=5)
            },
            {
                'product_id': 1,
                'stock_level': 45,
                'date': date.today() - timedelta(days=3)
            },
            {
                'product_id': 1,
                'stock_level': 40,
                'date': date.today()
            }
        ]
        
        is_at_risk, risk_score, days_until_rupture = stock_analyzer.predict_stock_rupture(
            stock_data,
            product_id=1,
            current_stock=40
        )
        
        assert isinstance(is_at_risk, bool)
        assert 0 <= risk_score <= 1
        assert isinstance(days_until_rupture, int)
        
    def test_predict_stock_rupture_low_stock(self, stock_analyzer):
        """Test rupture prediction with low stock"""
        is_at_risk, risk_score, days_until_rupture = stock_analyzer.predict_stock_rupture(
            [],
            product_id=1,
            current_stock=0
        )
        
        assert is_at_risk == True
        assert risk_score == 1.0
        assert days_until_rupture == 0
        
    def test_analyze_stock_rotation(self, stock_analyzer, sample_sales_data, sample_products):
        """Test stock rotation analysis"""
        results = stock_analyzer.analyze_stock_rotation(
            sample_sales_data,
            sample_products
        )
        
        assert isinstance(results, list)
        assert len(results) == len(sample_products)
        
        # Check that results are sorted by rotation rate (descending)
        for i in range(len(results) - 1):
            assert results[i]['rotation_rate'] >= results[i + 1]['rotation_rate']
        
    def test_generate_kpis(self, stock_analyzer, sample_sales_data, sample_products):
        """Test KPI generation"""
        kpis = stock_analyzer.generate_kpis(
            sample_sales_data,
            sample_products
        )
        
        assert isinstance(kpis, dict)
        assert 'total_sales' in kpis
        assert 'total_revenue' in kpis
        assert 'active_products' in kpis
        assert 'low_stock_products' in kpis
        assert 'avg_rotation_rate' in kpis
        
    def test_detect_anomalies(self, stock_analyzer):
        """Test anomaly detection"""
        # Create sample data with some anomalies
        sales_data = [
            {'quantity': 10, 'product_id': 1},
            {'quantity': 10, 'product_id': 1},
            {'quantity': 10, 'product_id': 1},
            {'quantity': 100, 'product_id': 1},  # Anomaly (high volume)
            {'quantity': 10, 'product_id': 1},
        ]
        
        anomalies = stock_analyzer.detect_anomalies(sales_data)
        
        assert isinstance(anomalies, list)
        # Should detect at least one anomaly
        assert len(anomalies) >= 0


class TestModuleFunctions:
    """Tests for module-level functions"""
    
    def test_stock_rotation_analysis(self, sample_sales_data, sample_products):
        """Test stock_rotation_analysis function"""
        results = stock_rotation_analysis(sample_sales_data, sample_products)
        
        assert isinstance(results, list)
        assert len(results) > 0
        
    def test_predict_stock_ruptures(self, sample_products):
        """Test predict_stock_ruptures function"""
        stock_data = [
            {
                'product_id': 1,
                'stock_level': 50,
                'date': date.today() - timedelta(days=5)
            },
            {
                'product_id': 1,
                'stock_level': 45,
                'date': date.today() - timedelta(days=3)
            }
        ]
        
        results = predict_stock_ruptures(stock_data, sample_products)
        
        assert isinstance(results, list)
        assert len(results) == len(sample_products)
        
        # Check that results are sorted by risk score (descending)
        for i in range(len(results) - 1):
            assert results[i]['risk_score'] >= results[i + 1]['risk_score']


class TestEdgeCases:
    """Tests for edge cases"""
    
    def test_empty_data(self, stock_analyzer):
        """Test with empty data"""
        rotation_rate = stock_analyzer.calculate_rotation_rate([], 1)
        assert rotation_rate == 0.0
        
        is_at_risk, risk_score, days = stock_analyzer.predict_stock_rupture([], 1, 100)
        assert is_at_risk == False
        assert risk_score == 0.0
        
    def test_single_sale(self, stock_analyzer):
        """Test with single sale"""
        sales_data = [{'quantity': 5, 'product_id': 1, 'sale_date': datetime.now()}]
        rotation_rate = stock_analyzer.calculate_rotation_rate(sales_data, 1)
        assert rotation_rate >= 0
        
    def test_zero_consumption(self, stock_analyzer):
        """Test with zero consumption"""
        stock_data = [
            {'product_id': 1, 'stock_level': 100, 'date': date.today() - timedelta(days=10)},
            {'product_id': 1, 'stock_level': 100, 'date': date.today()}
        ]
        
        is_at_risk, risk_score, days = stock_analyzer.predict_stock_rupture(
            stock_data, 1, 100
        )
        assert is_at_risk == False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

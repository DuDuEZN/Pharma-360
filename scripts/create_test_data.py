#!/usr/bin/env python3
"""
Script to create test data for Pharma 360
Creates initial users, products, categories, and test data
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import Optional

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Set environment variables for testing
os.environ['POSTGRES_HOST'] = 'localhost'
os.environ['POSTGRES_PORT'] = '5432'
os.environ['POSTGRES_DB'] = 'pharma360_dev'
os.environ['POSTGRES_USER'] = 'pharma_user'
os.environ['POSTGRES_PASSWORD'] = 'pharma_pass_2025'
os.environ['JWT_SECRET'] = 'test_secret_key_for_development_12345'
os.environ['APP_SECRET_KEY'] = 'test_app_secret_12345'


async def create_test_data():
    """Create test data for the application"""
    print("\n" + "="*60)
    print("Pharma 360 - Test Data Creation Script")
    print("="*60)
    
    try:
        # Import required modules
        from sqlalchemy import select, text
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from backend.core.security import PasswordUtils, JWTUtils
        
        # Create database connection
        DATABASE_URL = f"postgresql+asyncpg://{os.environ['POSTGRES_USER']}:{os.environ['POSTGRES_PASSWORD']}@{os.environ['POSTGRES_HOST']}:{os.environ['POSTGRES_PORT']}/{os.environ['POSTGRES_DB']}"
        engine = create_async_engine(DATABASE_URL)
        
        async with engine.begin() as conn:
            # Check if database is accessible
            try:
                await conn.execute(text("SELECT 1"))
                print("\n✓ Database connection successful")
            except Exception as e:
                print(f"\n✗ Database connection failed: {e}")
                print("\nPlease make sure PostgreSQL is running and the connection details are correct.")
                return False
        
        # Create test users
        print("\n--- Creating Test Users ---")
        
        users = [
            {
                'username': 'admin',
                'email': 'admin@pharma360.com',
                'full_name': 'Administrateur Principal',
                'role': 'admin',
                'password': 'admin123',
                'is_active': True
            },
            {
                'username': 'seller1',
                'email': 'seller1@pharma360.com',
                'full_name': 'Vendeur 1',
                'role': 'seller',
                'password': 'seller123',
                'is_active': True
            },
            {
                'username': 'cashier1',
                'email': 'cashier1@pharma360.com',
                'full_name': 'Caissier 1',
                'role': 'cashier',
                'password': 'cashier123',
                'is_active': True
            },
            {
                'username': 'manager1',
                'email': 'manager1@pharma360.com',
                'full_name': 'Manager 1',
                'role': 'manager',
                'password': 'manager123',
                'is_active': True
            }
        ]
        
        async with AsyncSession(engine) as session:
            for user_data in users:
                # Check if user already exists
                result = await session.execute(
                    text("SELECT id FROM users WHERE username = :username"),
                    {'username': user_data['username']}
                )
                existing = result.scalar()
                
                if existing:
                    print(f"  ⊘ User '{user_data['username']}' already exists (skipped)")
                    continue
                
                # Hash password
                hashed_password = PasswordUtils.hash_password(user_data['password'])
                
                # Insert user
                await session.execute(
                    text("""
                        INSERT INTO users (username, email, full_name, role, password_hash, is_active)
                        VALUES (:username, :email, :full_name, :role, :password_hash, :is_active)
                    """),
                    {
                        'username': user_data['username'],
                        'email': user_data['email'],
                        'full_name': user_data['full_name'],
                        'role': user_data['role'],
                        'password_hash': hashed_password,
                        'is_active': user_data['is_active']
                    }
                )
                print(f"  ✓ Created user: {user_data['username']} ({user_data['role']})")
            
            await session.commit()
        
        # Create test categories
        print("\n--- Creating Test Categories ---")
        
        categories = [
            'Antipaludéens',
            'Antibiotiques',
            'Antidouleurs',
            'Cardiovasculaires',
            'Diabète',
            'Vitamines',
            'Matériel Médical',
            'Autres'
        ]
        
        async with AsyncSession(engine) as session:
            for category_name in categories:
                result = await session.execute(
                    text("SELECT id FROM categories WHERE name = :name"),
                    {'name': category_name}
                )
                existing = result.scalar()
                
                if existing:
                    print(f"  ⊘ Category '{category_name}' already exists (skipped)")
                    continue
                
                await session.execute(
                    text("INSERT INTO categories (name, description) VALUES (:name, :description)"),
                    {'name': category_name, 'description': f'Produits {category_name}'}
                )
                print(f"  ✓ Created category: {category_name}")
            
            await session.commit()
        
        # Create test suppliers
        print("\n--- Creating Test Suppliers ---")
        
        suppliers = [
            {
                'name': 'Pharma Benin',
                'contact': 'Jean Dupont',
                'email': 'contact@pharmabenin.com',
                'phone': '+229 12 34 56 78',
                'address': '123 Rue de la Santé, Cotonou',
                'city': 'Cotonou',
                'country': 'Bénin'
            },
            {
                'name': 'Médicaments SA',
                'contact': 'Marie Martin',
                'email': 'ventes@medicaments-sa.com',
                'phone': '+229 23 45 67 89',
                'address': '456 Avenue des Médecins, Porto-Novo',
                'city': 'Porto-Novo',
                'country': 'Bénin'
            }
        ]
        
        async with AsyncSession(engine) as session:
            for supplier_data in suppliers:
                result = await session.execute(
                    text("SELECT id FROM suppliers WHERE name = :name"),
                    {'name': supplier_data['name']}
                )
                existing = result.scalar()
                
                if existing:
                    print(f"  ⊘ Supplier '{supplier_data['name']}' already exists (skipped)")
                    continue
                
                await session.execute(
                    text("""
                        INSERT INTO suppliers (name, contact, email, phone, address, city, country)
                        VALUES (:name, :contact, :email, :phone, :address, :city, :country)
                    """),
                    supplier_data
                )
                print(f"  ✓ Created supplier: {supplier_data['name']}")
            
            await session.commit()
        
        # Create test products
        print("\n--- Creating Test Products ---")
        
        # Get category IDs
        async with AsyncSession(engine) as session:
            result = await session.execute(text("SELECT id, name FROM categories"))
            categories = result.fetchall()
            category_map = {name: id for id, name in categories}
        
        # Get supplier IDs
        async with AsyncSession(engine) as session:
            result = await session.execute(text("SELECT id, name FROM suppliers"))
            suppliers = result.fetchall()
            supplier_map = {name: id for id, name in suppliers}
        
        products = [
            {
                'name': 'Paracétamol 500mg',
                'dci': 'Paracétamol',
                'barcode': 'PAR500001',
                'category_id': category_map.get('Antidouleurs', 1),
                'price': 150.00,
                'cost_price': 100.00,
                'stock_min': 10,
                'stock_max': 100,
                'unit': 'boîte',
                'manufacturer': 'Pharma Benin',
                'requires_prescription': False
            },
            {
                'name': 'Amoxicilline 500mg',
                'dci': 'Amoxicilline',
                'barcode': 'AMOX500001',
                'category_id': category_map.get('Antibiotiques', 1),
                'price': 300.00,
                'cost_price': 200.00,
                'stock_min': 5,
                'stock_max': 50,
                'unit': 'boîte',
                'manufacturer': 'Médicaments SA',
                'requires_prescription': True
            },
            {
                'name': 'Artesunate 100mg',
                'dci': 'Artesunate',
                'barcode': 'ART100001',
                'category_id': category_map.get('Antipaludéens', 1),
                'price': 500.00,
                'cost_price': 350.00,
                'stock_min': 15,
                'stock_max': 200,
                'unit': 'boîte',
                'manufacturer': 'Pharma Benin',
                'requires_prescription': True
            },
            {
                'name': 'Vitamine C 500mg',
                'dci': 'Acide Ascorbique',
                'barcode': 'VITC500001',
                'category_id': category_map.get('Vitamines', 1),
                'price': 200.00,
                'cost_price': 120.00,
                'stock_min': 20,
                'stock_max': 500,
                'unit': 'boîte',
                'manufacturer': 'Médicaments SA',
                'requires_prescription': False
            }
        ]
        
        async with AsyncSession(engine) as session:
            for product_data in products:
                result = await session.execute(
                    text("SELECT id FROM products WHERE barcode = :barcode"),
                    {'barcode': product_data['barcode']}
                )
                existing = result.scalar()
                
                if existing:
                    print(f"  ⊘ Product '{product_data['name']}' already exists (skipped)")
                    continue
                
                await session.execute(
                    text("""
                        INSERT INTO products 
                        (name, dci, barcode, category_id, price, cost_price, 
                         stock_min, stock_max, unit, manufacturer, requires_prescription)
                        VALUES 
                        (:name, :dci, :barcode, :category_id, :price, :cost_price,
                         :stock_min, :stock_max, :unit, :manufacturer, :requires_prescription)
                    """),
                    product_data
                )
                print(f"  ✓ Created product: {product_data['name']} ({product_data['barcode']})")
            
            await session.commit()
        
        # Create test batches
        print("\n--- Creating Test Batches ---")
        
        # Get product IDs
        async with AsyncSession(engine) as session:
            result = await session.execute(text("SELECT id, name FROM products"))
            products = result.fetchall()
            product_map = {name: id for id, name in products}
        
        # Get supplier IDs again
        async with AsyncSession(engine) as session:
            result = await session.execute(text("SELECT id, name FROM suppliers"))
            suppliers = result.fetchall()
            supplier_map = {name: id for id, name in suppliers}
        
        batches = [
            {
                'product_id': product_map.get('Paracétamol 500mg', 1),
                'batch_number': 'PAR500-2025-001',
                'expiry_date': (datetime.now() + timedelta(days=365*2)).strftime('%Y-%m-%d'),  # 2 years
                'quantity': 100,
                'initial_quantity': 100,
                'location': 'A-01-01',
                'received_date': datetime.now().strftime('%Y-%m-%d'),
                'supplier_id': supplier_map.get('Pharma Benin', 1),
                'cost_price': 100.00,
                'selling_price': 150.00,
                'status': 'active'
            },
            {
                'product_id': product_map.get('Amoxicilline 500mg', 1),
                'batch_number': 'AMOX500-2025-001',
                'expiry_date': (datetime.now() + timedelta(days=365*2)).strftime('%Y-%m-%d'),
                'quantity': 50,
                'initial_quantity': 50,
                'location': 'B-02-01',
                'received_date': datetime.now().strftime('%Y-%m-%d'),
                'supplier_id': supplier_map.get('Médicaments SA', 1),
                'cost_price': 200.00,
                'selling_price': 300.00,
                'status': 'active'
            },
            {
                'product_id': product_map.get('Artesunate 100mg', 1),
                'batch_number': 'ART100-2025-001',
                'expiry_date': (datetime.now() + timedelta(days=365*2)).strftime('%Y-%m-%d'),
                'quantity': 200,
                'initial_quantity': 200,
                'location': 'C-03-01',
                'received_date': datetime.now().strftime('%Y-%m-%d'),
                'supplier_id': supplier_map.get('Pharma Benin', 1),
                'cost_price': 350.00,
                'selling_price': 500.00,
                'status': 'active'
            },
            {
                'product_id': product_map.get('Vitamine C 500mg', 1),
                'batch_number': 'VITC500-2025-001',
                'expiry_date': (datetime.now() + timedelta(days=365*3)).strftime('%Y-%m-%d'),  # 3 years
                'quantity': 500,
                'initial_quantity': 500,
                'location': 'D-04-01',
                'received_date': datetime.now().strftime('%Y-%m-%d'),
                'supplier_id': supplier_map.get('Médicaments SA', 1),
                'cost_price': 120.00,
                'selling_price': 200.00,
                'status': 'active'
            }
        ]
        
        async with AsyncSession(engine) as session:
            for batch_data in batches:
                result = await session.execute(
                    text("SELECT id FROM batches WHERE batch_number = :batch_number"),
                    {'batch_number': batch_data['batch_number']}
                )
                existing = result.scalar()
                
                if existing:
                    print(f"  ⊘ Batch '{batch_data['batch_number']}' already exists (skipped)")
                    continue
                
                await session.execute(
                    text("""
                        INSERT INTO batches 
                        (product_id, batch_number, expiry_date, quantity, initial_quantity,
                         location, received_date, supplier_id, cost_price, selling_price, status)
                        VALUES 
                        (:product_id, :batch_number, :expiry_date, :quantity, :initial_quantity,
                         :location, :received_date, :supplier_id, :cost_price, :selling_price, :status)
                    """),
                    batch_data
                )
                print(f"  ✓ Created batch: {batch_data['batch_number']} ({batch_data['quantity']} units)")
            
            await session.commit()
        
        print("\n" + "="*60)
        print("✓ Test data created successfully!")
        print("="*60)
        print("\nDefault credentials:")
        for user in users:
            print(f"  - {user['username']}: {user['password']} ({user['role']})")
        print("\nYou can now use these credentials to login to the application.")
        print("="*60)
        
        await engine.dispose()
        return True
        
    except Exception as e:
        print(f"\n✗ Error creating test data: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(create_test_data())
    sys.exit(0 if success else 1)

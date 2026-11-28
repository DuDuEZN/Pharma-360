#!/usr/bin/env python3
"""Création d'un jeu de données minimal : 3 produits, 4 fournisseurs, 5 clients."""
import asyncio, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("APP_ENV", "test")

from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database import engine, Base, async_session_maker
from backend.models import (
    Category, Supplier, Customer, Product, Batch,
)

PRODUCTS = [
    {"name": "Paracétamol 500mg", "dci": "Paracétamol", "code": "PAR500001",
     "requires_prescription": False, "is_reimbursable": True, "price": 150.0, "cost_price": 100.0},
    {"name": "Amoxicilline 500mg", "dci": "Amoxicilline", "code": "AMOX500001",
     "requires_prescription": True, "is_reimbursable": True, "price": 300.0, "cost_price": 200.0},
    {"name": "Artesunate 100mg", "dci": "Artesunate", "code": "ART100001",
     "requires_prescription": True, "is_reimbursable": False, "price": 500.0, "cost_price": 350.0},
]

SUPPLIERS = [
    {"name": "Pharma Benin", "contact": "Jean Dupont", "email": "contact@pharmabenin.com",
     "phone": "+229 12 34 56 78", "address": "123 Rue de la Santé", "city": "Cotonou", "country": "Bénin"},
    {"name": "Médicaments SA", "contact": "Marie Martin", "email": "ventes@medicaments-sa.com",
     "phone": "+229 23 45 67 89", "address": "456 Avenue des Médecins", "city": "Porto-Novo", "country": "Bénin"},
    {"name": "Santé Plus", "contact": "Paul Koffi", "email": "info@santeplus.com",
     "phone": "+229 34 56 78 90", "address": "789 Boulevard de la Santé", "city": "Abomey-Calavi", "country": "Bénin"},
    {"name": "Pharma Express", "contact": "Awa Diallo", "email": "awa@pharmaexpress.com",
     "phone": "+229 45 67 89 01", "address": "321 Rue du Commerce", "city": "Parakou", "country": "Bénin"},
]

CUSTOMERS = [
    {"name": "Koffi Mensah", "phone": "+229 97 00 11 22", "email": "koffi@example.com"},
    {"name": "Afiwa Dossou", "phone": "+229 96 33 44 55", "email": "afiwa@example.com"},
    {"name": "Yves Ahouanvoebla", "phone": "+229 95 66 77 88", "email": "yves@example.com"},
    {"name": "Mariam Tchabi", "phone": "+229 94 99 00 11", "email": "mariam@example.com"},
    {"name": "Gabin Hounkpe", "phone": "+229 93 22 33 44", "email": "gabin@example.com"},
]

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session_maker() as session:
        # category
        cat = (await session.execute(select(Category).where(Category.name == "Antidouleurs"))).scalar_one_or_none()
        if cat is None:
            cat = Category(name="Antidouleurs", description="Antidouleurs")
            session.add(cat)
            await session.flush()
        # suppliers
        supplier_map = {}
        for s in SUPPLIERS:
            existing = (await session.execute(select(Supplier).where(Supplier.name == s["name"]))).scalar_one_or_none()
            if existing is None:
                existing = Supplier(**s)
                session.add(existing)
                await session.flush()
            supplier_map[s["name"]] = existing
        # customers
        for c in CUSTOMERS:
            existing = (await session.execute(select(Customer).where(Customer.name == c["name"]))).scalar_one_or_none()
            if existing is None:
                session.add(Customer(**c))
        # products + batches
        for p in PRODUCTS:
            existing = (await session.execute(select(Product).where(Product.code == p["code"]))).scalar_one_or_none()
            if existing is None:
                prod = Product(
                    name=p["name"], dci=p["dci"], code=p["code"], barcode=p["code"],
                    category_id=cat.id, price=p["price"], cost_price=p["cost_price"],
                    requires_prescription=p["requires_prescription"],
                    is_reimbursable=p["is_reimbursable"], unit="boîte",
                    stock_min=5, stock_max=100,
                )
                session.add(prod)
                await session.flush()
                session.add(Batch(
                    product_id=prod.id, batch_number=f"{p['code']}-001",
                    expiry_date=date.today() + timedelta(days=730),
                    quantity=100, initial_quantity=100, reserved_quantity=0,
                    location="A-01", received_date=date.today(),
                    supplier_id=list(supplier_map.values())[0].id,
                    cost_price=p["cost_price"], selling_price=p["price"], status="active",
                ))
        await session.commit()
    print("OK: 3 produits, 4 fournisseurs, 5 clients créés.")

asyncio.run(main())

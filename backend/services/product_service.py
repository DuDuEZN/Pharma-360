"""
Product Service for Pharmacie 360 Backend
Handles product management and FEFO/FIFO batch selection
"""

from datetime import date
from typing import Optional, List as ListType

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.product import Product
from ..models.batch import Batch
from ..models.category import Category
from ..schemas.product import (
    ProductResponse,
    ProductListResponse,
    ProductSearchResponse,
    BarcodeScanResponse,
)
from ..schemas.batch import BatchResponse


class ProductService:
    """Service for handling product operations"""
    
    @staticmethod
    async def get_product_by_id(
        product_id: int,
        db: AsyncSession
    ) -> Optional[Product]:
        """Get product by ID"""
        result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_product_by_barcode(
        barcode: str,
        db: AsyncSession
    ) -> Optional[Product]:
        """Get product by barcode"""
        result = await db.execute(
            select(Product).where(Product.barcode == barcode)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_product_by_dci(
        dci: str,
        db: AsyncSession
    ) -> list[Product]:
        """Get products by DCI"""
        result = await db.execute(
            select(Product).where(Product.dci == dci)
        )
        return result.scalars().all()
    
    @staticmethod
    async def list_products(
        page: int = 1,
        page_size: int = 20,
        category_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        db: AsyncSession = None
    ) -> ProductListResponse:
        """List products with pagination"""
        offset = (page - 1) * page_size
        
        # Build query
        query = select(Product)
        count_query = select(func.count()).select_from(Product)
        
        # Apply filters
        if category_id:
            query = query.where(Product.category_id == category_id)
            count_query = count_query.where(Product.category_id == category_id)
        
        if is_active is not None:
            query = query.where(Product.is_active == is_active)
            count_query = count_query.where(Product.is_active == is_active)
        
        if search:
            query = query.where(
                Product.name.ilike(f"%{search}%") |
                Product.dci.ilike(f"%{search}%") |
                Product.barcode.ilike(f"%{search}%") |
                Product.manufacturer.ilike(f"%{search}%")
            )
            count_query = count_query.where(
                Product.name.ilike(f"%{search}%") |
                Product.dci.ilike(f"%{search}%") |
                Product.barcode.ilike(f"%{search}%") |
                Product.manufacturer.ilike(f"%{search}%")
            )
        
        # Execute count query
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Execute main query
        query = query.offset(offset).limit(page_size).order_by(Product.name)
        result = await db.execute(query)
        products = result.scalars().all()
        
        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size
        
        # Convert to response objects
        product_responses = []
        for product in products:
            response = ProductResponse.model_validate(product)
            
            # Add computed fields
            response.current_stock = product.current_stock
            response.is_low_stock = product.is_low_stock
            response.is_overstocked = product.is_overstocked
            response.next_expiring_batch = (
                product.next_expiring_batch.batch_number 
                if product.next_expiring_batch else None
            )
            response.has_expiring_soon = product.has_expiring_soon
            response.category_name = (
                product.category.name if product.category else None
            )
            
            product_responses.append(response)
        
        return ProductListResponse(
            products=product_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    @staticmethod
    async def search_products(
        query: str,
        category_id: Optional[int] = None,
        limit: int = 20,
        db: AsyncSession = None
    ) -> ProductSearchResponse:
        """Search products by name, barcode, DCI, or manufacturer"""
        # Build query
        conditions = [
            Product.name.ilike(f"%{query}%")
        ]
        
        # Try to match barcode exactly if it looks like a barcode
        if len(query) >= 8 and query.isdigit():
            conditions.append(Product.barcode == query)
        
        conditions.extend([
            Product.dci.ilike(f"%{query}%"),
            Product.manufacturer.ilike(f"%{query}%"),
        ])
        
        if category_id:
            conditions.append(Product.category_id == category_id)
        
        query = select(Product).where(or_(*conditions)).limit(limit)
        
        result = await db.execute(query)
        products = result.scalars().all()
        
        # Convert to response objects
        product_responses = []
        for product in products:
            response = ProductResponse.model_validate(product)
            response.current_stock = product.current_stock
            response.is_low_stock = product.is_low_stock
            response.is_overstocked = product.is_overstocked
            response.next_expiring_batch = (
                product.next_expiring_batch.batch_number 
                if product.next_expiring_batch else None
            )
            response.has_expiring_soon = product.has_expiring_soon
            response.category_name = (
                product.category.name if product.category else None
            )
            
            product_responses.append(response)
        
        return ProductSearchResponse(
            products=product_responses,
            total=len(products)
        )
    
    @staticmethod
    async def scan_barcode(
        barcode: str,
        db: AsyncSession
    ) -> BarcodeScanResponse:
        """
        Scan barcode and return product with FEFO batch selection
        
        This is the CORE function for the sales workflow:
        1. Find product by barcode
        2. Find available batches (active, not expired, quantity > 0)
        3. Select batch with closest expiry date (FEFO)
        4. Return product and selected batch
        """
        # Find product by barcode
        product = await ProductService.get_product_by_barcode(barcode, db)
        
        if not product:
            return BarcodeScanResponse(
                product=None,
                batch=None,
                error=f"Produit non trouvé avec le code-barres: {barcode}"
            )
        
        # Find available batches for this product
        result = await db.execute(
            select(Batch)
            .where(
                and_(
                    Batch.product_id == product.id,
                    Batch.quantity > 0,
                    Batch.status == "active",
                    Batch.expiry_date >= date.today()
                )
            )
            .order_by(Batch.expiry_date.asc())  # FEFO: closest expiry first
        )
        batches = result.scalars().all()
        
        if not batches:
            return BarcodeScanResponse(
                product=ProductResponse.model_validate(product),
                batch=None,
                error="Aucun lot disponible pour ce produit (stock épuisé ou périmé)"
            )
        
        # Select first batch (FEFO: closest expiry)
        selected_batch = batches[0]
        
        # Convert to response objects
        product_response = ProductResponse.model_validate(product)
        product_response.current_stock = product.current_stock
        product_response.is_low_stock = product.is_low_stock
        product_response.is_overstocked = product.is_overstocked
        product_response.next_expiring_batch = selected_batch.batch_number
        product_response.has_expiring_soon = product.has_expiring_soon
        product_response.category_name = (
            product.category.name if product.category else None
        )
        
        batch_response = BatchResponse.model_validate(selected_batch)
        batch_response.product_name = product.name
        batch_response.supplier_name = (
            selected_batch.supplier.name if selected_batch.supplier else None
        )
        batch_response.is_active = selected_batch.is_active
        batch_response.is_expired = selected_batch.is_expired
        batch_response.is_available = selected_batch.is_available
        batch_response.percentage_used = selected_batch.percentage_used
        batch_response.days_until_expiry = selected_batch.days_until_expiry
        batch_response.is_expiring_soon = selected_batch.is_expiring_soon
        batch_response.fefo_priority = selected_batch.fefo_priority
        
        return BarcodeScanResponse(
            product=product_response,
            batch=batch_response,
            error=None
        )
    
    @staticmethod
    async def get_fefo_batch(
        product_id: int,
        quantity: int,
        db: AsyncSession
    ) -> Optional[Batch]:
        """
        Get the best batch for FEFO selection (optimized with indexed query)
        
        Args:
            product_id: ID of the product
            quantity: Requested quantity
            db: Database session
        
        Returns:
            Batch with closest expiry date that has enough stock, or None
        """
        result = await db.execute(
            select(Batch)
            .where(
                and_(
                    Batch.product_id == product_id,
                    Batch.quantity >= quantity,
                    Batch.status == "active",
                    Batch.expiry_date >= date.today()
                )
            )
            .order_by(Batch.expiry_date.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_fefo_batch_optimized(
        product_id: int,
        quantity: int,
        db: AsyncSession
    ) -> Optional[Batch]:
        """
        Get the best batch for FEFO selection with optimized query
        Uses indexed columns (product_id, expiry_date, status) for better performance
        
        Args:
            product_id: ID of the product
            quantity: Requested quantity
            db: Database session
        
        Returns:
            Batch with closest expiry date that has enough stock, or None
        
        Note: This method uses the PostgreSQL index on (product_id, expiry_date, status)
        for optimal performance with FEFO/FIFO queries.
        """
        result = await db.execute(
            select(Batch)
            .where(
                Batch.product_id == product_id,
                Batch.quantity >= quantity,
                Batch.status == "active",
                Batch.expiry_date >= date.today()
            )
            .order_by(Batch.expiry_date.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_low_stock_products(
        db: AsyncSession
    ) -> list[Product]:
        """Get all products with low stock"""
        result = await db.execute(
            select(Product).where(Product.is_low_stock == True)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_expiring_soon_products(
        db: AsyncSession
    ) -> list[Product]:
        """Get all products with batches expiring soon"""
        result = await db.execute(
            select(Product).where(Product.has_expiring_soon == True)
        )
        return result.scalars().all()


# Singleton instance
product_service = ProductService()

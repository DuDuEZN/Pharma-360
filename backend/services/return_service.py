"""
Return Service for Pharmacie 360 Backend
Business logic for managing product returns
"""

from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import joinedload

from ..models.return_ import Return
from ..models.product import Product
from ..models.batch import Batch
from ..models.user import User
from ..schemas.return_ import (
    ReturnCreate,
    ReturnUpdate,
    ReturnResponse,
    ReturnListResponse,
    ReturnStatsResponse,
)


class ReturnService:
    """Service for managing product returns"""
    
    @staticmethod
    async def list_returns(
        page: int = 1,
        page_size: int = 20,
        product_id: Optional[int] = None,
        batch_id: Optional[int] = None,
        reason: Optional[str] = None,
        user_id: Optional[int] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        db: AsyncSession = None
    ) -> ReturnListResponse:
        """List returns with optional filters"""
        offset = (page - 1) * page_size
        
        # Build query
        query = select(Return)
        count_query = select(func.count()).select_from(Return)
        
        # Apply filters
        if product_id:
            query = query.where(Return.product_id == product_id)
            count_query = count_query.where(Return.product_id == product_id)
        
        if batch_id:
            query = query.where(Return.batch_id == batch_id)
            count_query = count_query.where(Return.batch_id == batch_id)
        
        if reason:
            query = query.where(Return.reason == reason)
            count_query = count_query.where(Return.reason == reason)
        
        if user_id:
            query = query.where(Return.user_id == user_id)
            count_query = count_query.where(Return.user_id == user_id)
        
        if date_from:
            query = query.where(Return.created_at >= date_from)
            count_query = count_query.where(Return.created_at >= date_from)
        
        if date_to:
            query = query.where(Return.created_at <= date_to)
            count_query = count_query.where(Return.created_at <= date_to)
        
        # Execute count query
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Execute main query with ordering
        query = query.offset(offset).limit(page_size).order_by(Return.created_at.desc())
        result = await db.execute(query)
        returns = result.scalars().all()
        
        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size
        
        # Convert to response objects
        return_responses = []
        for ret in returns:
            response = ReturnResponse.model_validate(ret)
            
            # Add computed fields
            if ret.product:
                response.product_name = ret.product.name
            if ret.batch:
                response.batch_number = ret.batch.batch_number
            if ret.user:
                response.user_name = ret.user.username
            
            # Map reason to display format
            reasons = {
                "supplier": "Retour Fournisseur",
                "expiry": "Péremption",
                "damage": "Casse",
                "other": "Autre"
            }
            response.reason_display = reasons.get(ret.reason, ret.reason)
            
            return_responses.append(response)
        
        return ReturnListResponse(
            returns=return_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    @staticmethod
    async def get_return_by_id(
        return_id: int,
        db: AsyncSession = None
    ) -> Optional[Return]:
        """Get a specific return by ID"""
        result = await db.execute(
            select(Return)
            .where(Return.id == return_id)
            .options(
                joinedload(Return.product),
                joinedload(Return.batch),
                joinedload(Return.user)
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_return(
        return_data: ReturnCreate,
        db: AsyncSession = None,
        current_user: User = None
    ) -> ReturnResponse:
        """Create a new return"""
        # Verify batch exists
        result = await db.execute(
            select(Batch).where(Batch.id == return_data.batch_id)
        )
        batch = result.scalar_one_or_none()
        
        if not batch:
            raise ValueError("Batch not found")
        
        # Verify product exists
        result = await db.execute(
            select(Product).where(Product.id == return_data.product_id)
        )
        product = result.scalar_one_or_none()
        
        if not product:
            raise ValueError("Product not found")
        
        # Verify quantity is available in batch
        if batch.quantity < return_data.quantity:
            raise ValueError(f"Batch only has {batch.quantity} units available")
        
        # Create return
        new_return = Return(
            return_number=return_data.return_number,
            batch_id=return_data.batch_id,
            product_id=return_data.product_id,
            quantity=return_data.quantity,
            reason=return_data.reason,
            user_id=current_user.id,
            notes=return_data.notes
        )
        
        db.add(new_return)
        await db.commit()
        await db.refresh(new_return)
        
        # Update batch quantity
        batch.quantity -= return_data.quantity
        await db.commit()
        
        # Convert to response
        response = ReturnResponse.model_validate(new_return)
        
        # Add computed fields
        if new_return.product:
            response.product_name = new_return.product.name
        if new_return.batch:
            response.batch_number = new_return.batch.batch_number
        if new_return.user:
            response.user_name = new_return.user.username
        
        # Map reason to display format
        reasons = {
            "supplier": "Retour Fournisseur",
            "expiry": "Péremption",
            "damage": "Casse",
            "other": "Autre"
        }
        response.reason_display = reasons.get(new_return.reason, new_return.reason)
        
        return response
    
    @staticmethod
    async def update_return(
        return_id: int,
        return_data: ReturnUpdate,
        db: AsyncSession = None
    ) -> Optional[ReturnResponse]:
        """Update an existing return"""
        result = await db.execute(
            select(Return).where(Return.id == return_id)
        )
        ret = result.scalar_one_or_none()
        
        if not ret:
            return None
        
        # Update fields
        if return_data.return_number:
            ret.return_number = return_data.return_number
        if return_data.batch_id:
            ret.batch_id = return_data.batch_id
        if return_data.product_id:
            ret.product_id = return_data.product_id
        if return_data.quantity:
            ret.quantity = return_data.quantity
        if return_data.reason:
            ret.reason = return_data.reason
        if return_data.notes:
            ret.notes = return_data.notes
        
        await db.commit()
        await db.refresh(ret)
        
        # Convert to response
        response = ReturnResponse.model_validate(ret)
        
        # Add computed fields
        if ret.product:
            response.product_name = ret.product.name
        if ret.batch:
            response.batch_number = ret.batch.batch_number
        if ret.user:
            response.user_name = ret.user.username
        
        # Map reason to display format
        reasons = {
            "supplier": "Retour Fournisseur",
            "expiry": "Péremption",
            "damage": "Casse",
            "other": "Autre"
        }
        response.reason_display = reasons.get(ret.reason, ret.reason)
        
        return response
    
    @staticmethod
    async def delete_return(
        return_id: int,
        db: AsyncSession = None
    ) -> bool:
        """Delete a return"""
        result = await db.execute(
            select(Return).where(Return.id == return_id)
        )
        ret = result.scalar_one_or_none()
        
        if not ret:
            return False
        
        await db.delete(ret)
        await db.commit()
        return True
    
    @staticmethod
    async def get_return_stats(
        days: int = 30,
        db: AsyncSession = None
    ) -> ReturnStatsResponse:
        """Get return statistics"""
        from datetime import datetime, timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get all returns in period
        result = await db.execute(
            select(Return).where(Return.created_at >= cutoff_date)
        )
        returns = result.scalars().all()
        
        # Calculate statistics
        total_returns = len(returns)
        
        # Group by reason
        returns_by_reason = {}
        for ret in returns:
            reason = ret.reason
            returns_by_reason[reason] = returns_by_reason.get(reason, 0) + 1
        
        # Group by product
        returns_by_product = {}
        for ret in returns:
            product_id = ret.product_id
            product_name = ret.product.name if ret.product else f"Product {product_id}"
            key = f"{product_id}_{product_name}"
            returns_by_product[key] = returns_by_product.get(key, {
                "product_id": product_id,
                "product_name": product_name,
                "count": 0
            })
            returns_by_product[key]["count"] += 1
        
        # Format product stats
        formatted_products = [
            {"product_id": v["product_id"], "product_name": v["product_name"], "count": v["count"]}
            for v in returns_by_product.values()
        ]
        sorted_products = sorted(formatted_products, key=lambda x: x["count"], reverse=True)[:10]
        
        # Group by period (daily)
        returns_by_period = {}
        for ret in returns:
            date_str = ret.created_at.strftime("%Y-%m-%d")
            returns_by_period[date_str] = returns_by_period.get(date_str, 0) + 1
        
        return ReturnStatsResponse(
            total_returns=total_returns,
            returns_by_reason=returns_by_reason,
            returns_by_product={
                str(k): v for k, v in {p["product_id"]: p["count"] for p in sorted_products}.items()
            },
            returns_by_period=returns_by_period,
            most_returned_products=sorted_products
        )

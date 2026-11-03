"""
WebSocket API Endpoints for Pharmacie 360 Backend
Real-time communication between Sales and Cashier sessions
"""

import asyncio
import json
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from sqlalchemy import select

from ..core.database import async_session_maker
from ..core.security import JWTUtils, TokenType, get_current_user
from ..models.user import User
from ..schemas.sale import QueueItem
from ..services.sale_service import SaleService

# WebSocket router
router = APIRouter(prefix="/ws", tags=["websocket"])


# Connection manager for WebSocket
class ConnectionManager:
    """Manages WebSocket connections for different roles"""

    def __init__(self):
        self.active_connections: Dict[str, Dict[int, WebSocket]] = {
            "sales": {},  # user_id -> WebSocket
            "cashiers": {},  # user_id -> WebSocket
        }
        self.queue_updates = asyncio.Queue()
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user: User, group: str):
        """Register an already-accepted WebSocket in the given group"""
        async with self.lock:
            self.active_connections[group][user.id] = websocket

    async def disconnect(self, user: User, group: str):
        """Remove a WebSocket connection"""
        async with self.lock:
            self.active_connections[group].pop(user.id, None)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket"""
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    async def broadcast_to_sales(
        self, message: dict, exclude_user_id: Optional[int] = None
    ):
        """Broadcast message to all sales connections"""
        async with self.lock:
            for user_id, websocket in self.active_connections["sales"].items():
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_cashiers(
        self, message: dict, exclude_user_id: Optional[int] = None
    ):
        """Broadcast message to all cashier connections"""
        async with self.lock:
            for user_id, websocket in self.active_connections["cashiers"].items():
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_all(self, message: dict):
        """Broadcast message to all connections"""
        async with self.lock:
            for group in self.active_connections.values():
                for websocket in group.values():
                    try:
                        await websocket.send_json(message)
                    except Exception:
                        pass


# Initialize connection manager
manager = ConnectionManager()


async def authenticate_websocket(token: str, allowed_roles: tuple):
    """Validate the JWT and load the user. Returns (user, error_message)."""
    try:
        payload = JWTUtils.decode_token(token)
    except HTTPException:
        return None, "Invalid or expired token"

    if payload.get("type") != TokenType.ACCESS:
        return None, "Invalid token type"

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None, "Invalid token subject"

    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None, "User not found or inactive"
    if user.role not in allowed_roles:
        return None, "Role not allowed for this WebSocket"
    return user, None


async def _serve(websocket: WebSocket, token: str, allowed_roles: tuple,
                 group: str, handlers: Dict[str, str]):
    """Shared loop. handlers maps message type -> broadcast target ('sales'|'cashiers')."""
    # Accept first so the browser gets a real close code instead of a failed handshake
    await websocket.accept()

    user, error = await authenticate_websocket(token, allowed_roles)
    if error:
        await websocket.close(code=1008, reason=error)
        return

    await manager.connect(websocket, user, group)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue

            message_type = message.get("type")
            if message_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif message_type in handlers:
                payload = {"type": message_type, "data": message.get("data")}
                if handlers[message_type] == "cashiers":
                    await manager.broadcast_to_cashiers(payload)
                else:
                    await manager.broadcast_to_sales(payload)
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user, group)


@router.websocket("/sales")
async def sales_websocket(websocket: WebSocket, token: str):
    """WebSocket endpoint for Sales session"""
    await _serve(
        websocket, token, ("seller", "admin"), "sales",
        {"new_sale": "cashiers", "sale_cancelled": "cashiers"},
    )


@router.websocket("/cashier")
async def cashier_websocket(websocket: WebSocket, token: str):
    """WebSocket endpoint for Cashier session"""
    await _serve(
        websocket, token, ("cashier", "admin"), "cashiers",
        {"payment_validated": "sales", "queue_update": "sales"},
    )


@router.get("/queue")
async def get_queue_via_http(
    db: object = Depends(lambda: None),  # Will be injected
):
    """HTTP endpoint to get current queue (for debugging)"""
    from ..core.database import async_session_maker

    async with async_session_maker() as db:
        queue_items = await SaleService.get_queue_items(db)

    return {"queue": queue_items}


# Test HTML page for WebSocket testing
@router.get("/test")
async def websocket_test_page():
    """Test page for WebSocket connections"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pharmacie 360 - WebSocket Test</title>
    </head>
    <body>
        <h1>WebSocket Test Page</h1>
        <div>
            <h2>Sales WebSocket</h2>
            <input type="text" id="salesToken" placeholder="JWT Token">
            <button onclick="connectSales()">Connect Sales</button>
            <button onclick="sendSalesMessage()">Send Message</button>
            <div id="salesMessages"></div>
        </div>
        <div>
            <h2>Cashier WebSocket</h2>
            <input type="text" id="cashierToken" placeholder="JWT Token">
            <button onclick="connectCashier()">Connect Cashier</button>
            <button onclick="sendCashierMessage()">Send Message</button>
            <div id="cashierMessages"></div>
        </div>
        
        <script>
            let salesSocket = null;
            let cashierSocket = null;
            
            function connectSales() {
                const token = document.getElementById('salesToken').value;
                if (!token) {
                    alert('Please enter JWT token');
                    return;
                }
                
                if (salesSocket) {
                    salesSocket.close();
                }
                
                const url = `ws://${window.location.host}/ws/sales?token=${encodeURIComponent(token)}`;
                salesSocket = new WebSocket(url);
                
                salesSocket.onopen = () => {
                    addMessage('salesMessages', 'Connected to Sales WebSocket');
                };
                
                salesSocket.onmessage = (event) => {
                    addMessage('salesMessages', `Received: ${event.data}`);
                };
                
                salesSocket.onclose = () => {
                    addMessage('salesMessages', 'Disconnected from Sales WebSocket');
                    salesSocket = null;
                };
            }
            
            function connectCashier() {
                const token = document.getElementById('cashierToken').value;
                if (!token) {
                    alert('Please enter JWT token');
                    return;
                }
                
                if (cashierSocket) {
                    cashierSocket.close();
                }
                
                const url = `ws://${window.location.host}/ws/cashier?token=${encodeURIComponent(token)}`;
                cashierSocket = new WebSocket(url);
                
                cashierSocket.onopen = () => {
                    addMessage('cashierMessages', 'Connected to Cashier WebSocket');
                };
                
                cashierSocket.onmessage = (event) => {
                    addMessage('cashierMessages', `Received: ${event.data}`);
                };
                
                cashierSocket.onclose = () => {
                    addMessage('cashierMessages', 'Disconnected from Cashier WebSocket');
                    cashierSocket = null;
                };
            }
            
            function sendSalesMessage() {
                if (!salesSocket || salesSocket.readyState !== WebSocket.OPEN) {
                    alert('Sales WebSocket not connected');
                    return;
                }
                
                const message = {
                    type: 'new_sale',
                    data: {
                        sale_id: 1,
                        sale_number: 'TEST-001',
                        total: 1000.00
                    }
                };
                salesSocket.send(JSON.stringify(message));
            }
            
            function sendCashierMessage() {
                if (!cashierSocket || cashierSocket.readyState !== WebSocket.OPEN) {
                    alert('Cashier WebSocket not connected');
                    return;
                }
                
                const message = {
                    type: 'payment_validated',
                    data: {
                        sale_id: 1,
                        sale_number: 'TEST-001'
                    }
                };
                cashierSocket.send(JSON.stringify(message));
            }
            
            function addMessage(elementId, message) {
                const div = document.getElementById(elementId);
                const p = document.createElement('p');
                p.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
                div.appendChild(p);
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html, status_code=200)

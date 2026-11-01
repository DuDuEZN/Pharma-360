"""
WebSocket API Endpoints for Pharmacie 360 Backend
Real-time communication between Sales and Cashier sessions
"""

import asyncio
import json
from typing import Dict, Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from ..core.security import get_current_user
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

    async def connect(self, websocket: WebSocket, user: User):
        """Accept a new WebSocket connection"""
        await websocket.accept()

        role = user.role
        if role not in ["seller", "cashier", "admin"]:
            await websocket.close(code=1008, reason="Invalid role for WebSocket")
            return False

        # Map role to connection group
        group = "sales" if role in ["seller", "admin"] else "cashiers"

        async with self.lock:
            self.active_connections[group][user.id] = websocket

        return True

    async def disconnect(self, websocket: WebSocket, user: User):
        """Remove a WebSocket connection"""
        role = user.role
        group = "sales" if role in ["seller", "admin"] else "cashiers"

        async with self.lock:
            if user.id in self.active_connections[group]:
                del self.active_connections[group][user.id]

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


@router.websocket("/sales")
async def sales_websocket(websocket: WebSocket, token: str):
    """WebSocket endpoint for Sales session"""
    # Authenticate user
    try:
        from ..core.security import JWTUtils

        payload = JWTUtils.decode_token(token)

        # Get user from database
        from ..core.database import async_session_maker

        async with async_session_maker() as db:
            result = await db.execute(
                "SELECT * FROM users WHERE id = :user_id",
                {"user_id": payload.get("sub")},
            )
            user = result.scalar_one_or_none()

            if not user:
                await websocket.close(code=1008, reason="User not found")
                return

        # Check role
        if user.role not in ["seller", "admin"]:
            await websocket.close(code=1008, reason="Invalid role for sales WebSocket")
            return

        # Connect
        connected = await manager.connect(websocket, user)
        if not connected:
            return

        try:
            while True:
                # Wait for message from client
                data = await websocket.receive_text()

                try:
                    message = json.loads(data)
                except json.JSONDecodeError:
                    continue

                # Handle different message types
                message_type = message.get("type")

                if message_type == "new_sale":
                    # Broadcast new sale to cashiers
                    await manager.broadcast_to_cashiers(
                        {"type": "new_sale", "data": message.get("data")}
                    )

                elif message_type == "sale_cancelled":
                    # Broadcast sale cancellation
                    await manager.broadcast_to_cashiers(
                        {"type": "sale_cancelled", "data": message.get("data")}
                    )

                elif message_type == "ping":
                    # Respond to ping
                    await websocket.send_json({"type": "pong"})

        except WebSocketDisconnect:
            manager.disconnect(websocket, user)

    except Exception as e:
        await websocket.close(code=1011, reason=str(e))


@router.websocket("/cashier")
async def cashier_websocket(websocket: WebSocket, token: str):
    """WebSocket endpoint for Cashier session"""
    # Authenticate user
    try:
        from ..core.security import JWTUtils

        payload = JWTUtils.decode_token(token)

        # Get user from database
        from ..core.database import async_session_maker

        async with async_session_maker() as db:
            result = await db.execute(
                "SELECT * FROM users WHERE id = :user_id",
                {"user_id": payload.get("sub")},
            )
            user = result.scalar_one_or_none()

            if not user:
                await websocket.close(code=1008, reason="User not found")
                return

        # Check role
        if user.role not in ["cashier", "admin"]:
            await websocket.close(
                code=1008, reason="Invalid role for cashier WebSocket"
            )
            return

        # Connect
        connected = await manager.connect(websocket, user)
        if not connected:
            return

        try:
            while True:
                # Wait for message from client
                data = await websocket.receive_text()

                try:
                    message = json.loads(data)
                except json.JSONDecodeError:
                    continue

                # Handle different message types
                message_type = message.get("type")

                if message_type == "payment_validated":
                    # Broadcast payment validation to sales
                    await manager.broadcast_to_sales(
                        {"type": "payment_validated", "data": message.get("data")}
                    )

                elif message_type == "queue_update":
                    # Broadcast queue update
                    await manager.broadcast_to_sales(
                        {"type": "queue_update", "data": message.get("data")}
                    )

                elif message_type == "ping":
                    # Respond to ping
                    await websocket.send_json({"type": "pong"})

        except WebSocketDisconnect:
            manager.disconnect(websocket, user)

    except Exception as e:
        await websocket.close(code=1011, reason=str(e))


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

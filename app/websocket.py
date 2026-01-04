from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.vehicle_subscribers: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        # Remove from vehicle subscribers
        for vehicle_id in list(self.vehicle_subscribers.keys()):
            if websocket in self.vehicle_subscribers[vehicle_id]:
                self.vehicle_subscribers[vehicle_id].remove(websocket)
        print(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending message: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    def subscribe_to_vehicle(self, vehicle_id: int, websocket: WebSocket):
        """Subscribe a client to updates for specific vehicle"""
        if vehicle_id not in self.vehicle_subscribers:
            self.vehicle_subscribers[vehicle_id] = []
        if websocket not in self.vehicle_subscribers[vehicle_id]:
            self.vehicle_subscribers[vehicle_id].append(websocket)

    async def notify_vehicle_update(self, vehicle_id: int, data: dict):
        """Notify subscribers about vehicle position update"""
        if vehicle_id in self.vehicle_subscribers:
            disconnected = []
            for websocket in self.vehicle_subscribers[vehicle_id]:
                try:
                    await websocket.send_json({
                        "type": "position_update",
                        "vehicle_id": vehicle_id,
                        "data": data
                    })
                except Exception:
                    disconnected.append(websocket)
            
            # Clean up
            for conn in disconnected:
                if conn in self.vehicle_subscribers[vehicle_id]:
                    self.vehicle_subscribers[vehicle_id].remove(conn)

manager = ConnectionManager()
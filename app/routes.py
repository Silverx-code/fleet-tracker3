from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from .db import get_db
from . import models
from .schemas import VehicleCreate, VehicleOut, PositionCreate, PositionOut
from .websocket import manager
from .auth import verify_device_token
import asyncio

router = APIRouter()

# ==================== VEHICLE ENDPOINTS ====================

@router.post("/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    """Create a new vehicle"""
    # Check if vehicle with same name exists
    existing = db.query(models.Vehicle).filter(models.Vehicle.name == payload.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with name '{payload.name}' already exists"
        )
    
    # Check if plate number exists (if provided)
    if payload.plate_no:
        existing_plate = db.query(models.Vehicle).filter(
            models.Vehicle.plate_no == payload.plate_no
        ).first()
        if existing_plate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with plate '{payload.plate_no}' already exists"
            )
    
    # Create vehicle
    vehicle = models.Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/vehicles", response_model=List[VehicleOut])
def list_vehicles(
    skip: int = 0, 
    limit: int = 100, 
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """Get all vehicles with optional filtering"""
    query = db.query(models.Vehicle)
    
    # Filter for active vehicles only if requested
    if active_only:
        query = query.filter(models.Vehicle.is_active == True)
    
    vehicles = query.offset(skip).limit(limit).all()
    return vehicles


@router.get("/vehicles/with-last-position")
def vehicles_with_last_position(db: Session = Depends(get_db)):
    """
    Get all vehicles with their latest position in ONE query
    Much faster than making separate queries per vehicle
    """
    # Subquery to get latest position timestamp for each vehicle
    subquery = (
        db.query(
            models.Position.vehicle_id,
            func.max(models.Position.recorded_at).label('max_time')
        )
        .group_by(models.Position.vehicle_id)
        .subquery()
    )
    
    # Join vehicles with their latest positions
    results = (
        db.query(models.Vehicle, models.Position)
        .outerjoin(
            subquery,
            models.Vehicle.id == subquery.c.vehicle_id
        )
        .outerjoin(
            models.Position,
            (models.Position.vehicle_id == models.Vehicle.id) &
            (models.Position.recorded_at == subquery.c.max_time)
        )
        .all()
    )
    
    # Format response
    output = []
    for vehicle, position in results:
        vehicle_data = {
            "id": vehicle.id,
            "name": vehicle.name,
            "plate_no": vehicle.plate_no,
            "is_active": getattr(vehicle, 'is_active', True),
            "last_position": None
        }
        
        if position:
            vehicle_data["last_position"] = {
                "id": position.id,
                "lat": position.lat,
                "lng": position.lng,
                "speed": position.speed,
                "recorded_at": position.recorded_at.isoformat()
            }
        
        output.append(vehicle_data)
    
    return output


@router.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Get a specific vehicle by ID"""
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found"
        )
    return vehicle


@router.put("/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int, 
    payload: VehicleCreate, 
    db: Session = Depends(get_db)
):
    """Update a vehicle"""
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found"
        )
    
    # Check if new name conflicts with another vehicle
    if payload.name != vehicle.name:
        existing = db.query(models.Vehicle).filter(
            models.Vehicle.name == payload.name,
            models.Vehicle.id != vehicle_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with name '{payload.name}' already exists"
            )
    
    # Check if new plate conflicts with another vehicle
    if payload.plate_no and payload.plate_no != vehicle.plate_no:
        existing_plate = db.query(models.Vehicle).filter(
            models.Vehicle.plate_no == payload.plate_no,
            models.Vehicle.id != vehicle_id
        ).first()
        if existing_plate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with plate '{payload.plate_no}' already exists"
            )
    
    # Update fields
    vehicle.name = payload.name
    vehicle.plate_no = payload.plate_no
    
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Delete a vehicle"""
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found"
        )
    db.delete(vehicle)
    db.commit()
    return None


# ==================== POSITION ENDPOINTS ====================

@router.post("/positions", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
async def add_position(payload: PositionCreate, db: Session = Depends(get_db)):
    """Add a new GPS position for a vehicle"""
    # Verify vehicle exists
    vehicle = db.query(models.Vehicle).filter(
        models.Vehicle.id == payload.vehicle_id
    ).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {payload.vehicle_id} not found"
        )
    
    # Create position
    position = models.Position(**payload.model_dump())
    db.add(position)
    db.commit()
    db.refresh(position)
    
    # Broadcast to WebSocket clients
    asyncio.create_task(manager.notify_vehicle_update(
        payload.vehicle_id,
        {
            "id": position.id,
            "lat": position.lat,
            "lng": position.lng,
            "speed": position.speed,
            "recorded_at": position.recorded_at.isoformat()
        }
    ))
    
    return position


@router.get("/positions/{vehicle_id}", response_model=List[PositionOut])
def get_positions(
    vehicle_id: int,
    limit: int = 1000,
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """Get position history for a vehicle (most recent first)"""
    # Verify vehicle exists
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with id {vehicle_id} not found"
        )
    
    # Get positions
    positions = (
        db.query(models.Position)
        .filter(models.Position.vehicle_id == vehicle_id)
        .order_by(models.Position.recorded_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return positions


@router.get("/positions/{vehicle_id}/latest", response_model=PositionOut)
def get_latest_position(vehicle_id: int, db: Session = Depends(get_db)):
    """Get the most recent position for a vehicle"""
    position = (
        db.query(models.Position)
        .filter(models.Position.vehicle_id == vehicle_id)
        .order_by(models.Position.recorded_at.desc())
        .first()
    )
    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No positions found for vehicle {vehicle_id}"
        )
    return position


# ==================== GPS DEVICE ENDPOINTS ====================

@router.post("/device/position", status_code=status.HTTP_201_CREATED)
async def device_position_update(
    payload: dict,
    token: str = Depends(verify_device_token),
    db: Session = Depends(get_db)
):
    """
    Endpoint for GPS devices to send position updates
    
    Expected payload formats:
    1. Simple format:
       {
         "device_id": "ABC123",
         "lat": 6.5244,
         "lng": 3.3792,
         "speed": 45.5,
         "timestamp": "2024-01-01T12:00:00Z"  (optional)
       }
    
    2. Standard GPS format (various protocols):
       {
         "imei": "123456789012345",
         "latitude": 6.5244,
         "longitude": 3.3792,
         "speed": 45.5,
         "heading": 90,
         "altitude": 100,
         "timestamp": "2024-01-01T12:00:00Z",
         "satellites": 8
       }
    """
    
    try:
        # Parse different field names from various GPS devices
        device_id = (
            payload.get("device_id") or 
            payload.get("imei") or 
            payload.get("deviceId") or
            payload.get("id")
        )
        
        lat = payload.get("lat") or payload.get("latitude")
        lng = payload.get("lng") or payload.get("longitude") or payload.get("lon")
        speed = payload.get("speed", 0)
        timestamp = payload.get("timestamp")
        
        if not device_id or lat is None or lng is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: device_id, lat, lng"
            )
        
        # Find vehicle by device_id (stored in plate_no or name)
        vehicle = db.query(models.Vehicle).filter(
            (models.Vehicle.plate_no == device_id) | 
            (models.Vehicle.name == device_id)
        ).first()
        
        if not vehicle:
            # Auto-create vehicle if not exists
            vehicle = models.Vehicle(
                name=f"Device-{device_id}",
                plate_no=device_id
            )
            db.add(vehicle)
            db.commit()
            db.refresh(vehicle)
            print(f"Auto-created vehicle for device {device_id}")
        
        # Parse timestamp if provided
        recorded_at = datetime.utcnow()
        if timestamp:
            try:
                recorded_at = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                pass
        
        # Create position
        position = models.Position(
            vehicle_id=vehicle.id,
            lat=float(lat),
            lng=float(lng),
            speed=float(speed),
            recorded_at=recorded_at
        )
        db.add(position)
        db.commit()
        db.refresh(position)
        
        # Broadcast to WebSocket clients
        asyncio.create_task(manager.notify_vehicle_update(
            vehicle.id,
            {
                "id": position.id,
                "lat": position.lat,
                "lng": position.lng,
                "speed": position.speed,
                "recorded_at": position.recorded_at.isoformat()
            }
        ))
        
        return {
            "status": "success",
            "message": "Position recorded",
            "vehicle_id": vehicle.id,
            "position_id": position.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing device position: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process position: {str(e)}"
        )


@router.post("/device/batch", status_code=status.HTTP_201_CREATED)
async def device_batch_update(
    payload: dict,
    token: str = Depends(verify_device_token),
    db: Session = Depends(get_db)
):
    """
    Batch endpoint for GPS devices to send multiple positions at once
    
    Payload:
    {
      "device_id": "ABC123",
      "positions": [
        {"lat": 6.5244, "lng": 3.3792, "speed": 45, "timestamp": "..."},
        {"lat": 6.5245, "lng": 3.3793, "speed": 46, "timestamp": "..."}
      ]
    }
    """
    
    device_id = payload.get("device_id")
    positions_data = payload.get("positions", [])
    
    if not device_id or not positions_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing device_id or positions"
        )
    
    # Find or create vehicle
    vehicle = db.query(models.Vehicle).filter(
        (models.Vehicle.plate_no == device_id) | 
        (models.Vehicle.name == device_id)
    ).first()
    
    if not vehicle:
        vehicle = models.Vehicle(
            name=f"Device-{device_id}",
            plate_no=device_id
        )
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
    
    # Create all positions
    created_count = 0
    latest_position = None
    
    for pos_data in positions_data:
        try:
            lat = pos_data.get("lat")
            lng = pos_data.get("lng")
            
            if lat is None or lng is None:
                continue
            
            timestamp = pos_data.get("timestamp")
            recorded_at = datetime.utcnow()
            if timestamp:
                try:
                    recorded_at = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except:
                    pass
            
            position = models.Position(
                vehicle_id=vehicle.id,
                lat=float(lat),
                lng=float(lng),
                speed=float(pos_data.get("speed", 0)),
                recorded_at=recorded_at
            )
            db.add(position)
            created_count += 1
            latest_position = position
            
        except Exception as e:
            print(f"Error processing batch position: {e}")
            continue
    
    db.commit()
    
    # Broadcast latest position
    if latest_position:
        asyncio.create_task(manager.notify_vehicle_update(
            vehicle.id,
            {
                "id": latest_position.id,
                "lat": latest_position.lat,
                "lng": latest_position.lng,
                "speed": latest_position.speed,
                "recorded_at": latest_position.recorded_at.isoformat()
            }
        ))
    
    return {
        "status": "success",
        "message": f"Recorded {created_count} positions",
        "vehicle_id": vehicle.id,
        "count": created_count
    }


# ==================== WEBSOCKET ENDPOINT ====================

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "subscribe":
                vehicle_id = data.get("vehicle_id")
                if vehicle_id:
                    manager.subscribe_to_vehicle(vehicle_id, websocket)
                    await manager.send_personal_message({
                        "type": "subscribed",
                        "vehicle_id": vehicle_id
                    }, websocket)
            
            elif data.get("type") == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
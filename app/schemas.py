from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# Vehicle Schemas
class VehicleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Vehicle name")
    plate_no: Optional[str] = Field(None, max_length=20, description="License plate number")

class VehicleCreate(VehicleBase):
    """Schema for creating a new vehicle"""
    pass

class VehicleOut(VehicleBase):
    """Schema for vehicle response"""
    id: int
    
    class Config:
        from_attributes = True

# Position Schemas
class PositionBase(BaseModel):
    vehicle_id: int = Field(..., gt=0, description="ID of the vehicle")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    speed: Optional[float] = Field(0.0, ge=0, description="Speed in km/h")

class PositionCreate(PositionBase):
    """Schema for creating a new position"""
    pass

class PositionOut(PositionBase):
    """Schema for position response"""
    id: int
    recorded_at: datetime
    
    class Config:
        from_attributes = True
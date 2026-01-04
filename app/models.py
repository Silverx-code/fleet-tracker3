from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Boolean
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class Vehicle(Base):
    """Vehicle model - represents a tracked vehicle"""
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    plate_no = Column(String, unique=True, index=True, nullable=True)

    # Relationships
    positions = relationship(
        "Position",
        back_populates="vehicle",
        cascade="all, delete-orphan"
    )
    devices = relationship(
        "Device",
        back_populates="vehicle"
    )

    def __repr__(self):
        return f"<Vehicle(id={self.id}, name={self.name}, plate={self.plate_no})>"


class Device(Base):
    """GPS Device model - track device information"""
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, index=True, nullable=False)  # IMEI or unique ID
    device_type = Column(String, nullable=True)  # GPS Tracker, Mobile App
    firmware_version = Column(String, nullable=True)

    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)

    last_seen = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationship
    vehicle = relationship("Vehicle", back_populates="devices")

    def __repr__(self):
        return f"<Device(device_id={self.device_id}, active={self.is_active})>"


class Position(Base):
    """Position model - GPS location of a vehicle at a point in time"""
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)

    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)

    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationship
    vehicle = relationship("Vehicle", back_populates="positions")

    def __repr__(self):
        return f"<Position(vehicle_id={self.vehicle_id}, lat={self.lat}, lng={self.lng})>"

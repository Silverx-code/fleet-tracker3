from fastapi import Header, HTTPException, status
from typing import Optional
import os

# Simple API key authentication for devices
DEVICE_API_KEY = os.getenv("DEVICE_API_KEY", "your-secret-device-key-change-this")

async def verify_device_token(x_device_token: Optional[str] = Header(None)):
    """Verify device API token"""
    if not x_device_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device token missing"
        )
    
    if x_device_token != DEVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device token"
        )
    
    return x_device_token
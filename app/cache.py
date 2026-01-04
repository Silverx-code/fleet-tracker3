import redis
import json
from typing import Optional
import os

# Redis connection
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

def cache_get(key: str) -> Optional[dict]:
    """Get cached data"""
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else None
    except:
        return None

def cache_set(key: str, value: dict, ttl: int = 300):
    """Cache data with TTL (default 5 minutes)"""
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except:
        pass

def cache_delete(key: str):
    """Delete cached data"""
    try:
        redis_client.delete(key)
    except:
        pass

def cache_delete_pattern(pattern: str):
    """Delete all keys matching pattern"""
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
    except:
        pass
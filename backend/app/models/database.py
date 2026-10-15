import logging
import hashlib
import json
from typing import Optional, Dict, Any
from datetime import datetime
import motor.motor_asyncio
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from app.config import settings

logger = logging.getLogger("climate_app.database")


class CacheManager:
    """
    Dual-tier caching engine with MongoDB NoSQL primary store
    and automatic in-memory fallback.
    """

    def __init__(self):
        self.client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
        self.db: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None
        self.is_mongo_connected: bool = False
        self._memory_cache: Dict[str, Dict[str, Any]] = {}

    async def connect(self):
        """Establish connection to MongoDB and ensure indexes."""
        try:
            self.client = motor.motor_asyncio.AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2500,
                connectTimeoutMS=2500
            )
            # Ping to verify active connection
            await self.client.admin.command('ping')
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_mongo_connected = True
            logger.info("Successfully connected to MongoDB at %s", settings.MONGODB_URI)

            # Ensure indexes
            await self.db.raw_weather.create_index("cache_key", unique=True)
            await self.db.hazard_analysis.create_index("cache_key", unique=True)
            await self.db.raw_weather.create_index("created_at", expireAfterSeconds=settings.CACHE_TTL_DAYS * 86400)
            await self.db.hazard_analysis.create_index("created_at", expireAfterSeconds=settings.CACHE_TTL_DAYS * 86400)

        except (ServerSelectionTimeoutError, PyMongoError, Exception) as e:
            self.is_mongo_connected = False
            logger.warning(
                "MongoDB not reachable (%s). Falling back to resilient in-memory cache.",
                str(e)
            )

    async def disconnect(self):
        """Close MongoDB client connection."""
        if self.client:
            self.client.close()
            self.is_mongo_connected = False
            logger.info("MongoDB connection closed.")

    @staticmethod
    def generate_key(*args) -> str:
        """Create a deterministic SHA-256 hash for cache keys."""
        raw_str = ":".join(str(arg) for arg in args)
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    async def get_raw_weather(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached raw weather timeseries."""
        if self.is_mongo_connected and self.db is not None:
            try:
                doc = await self.db.raw_weather.find_one({"cache_key": key})
                if doc:
                    return doc.get("payload")
            except Exception as e:
                logger.error("MongoDB get_raw_weather error: %s", e)

        # Fallback to in-memory cache
        mem_entry = self._memory_cache.get(f"weather:{key}")
        if mem_entry:
            return mem_entry.get("payload")
        return None

    async def set_raw_weather(self, key: str, payload: Dict[str, Any]):
        """Persist raw weather data into NoSQL cache."""
        now = datetime.utcnow()
        if self.is_mongo_connected and self.db is not None:
            try:
                await self.db.raw_weather.update_one(
                    {"cache_key": key},
                    {"$set": {"cache_key": key, "payload": payload, "created_at": now}},
                    upsert=True
                )
                return
            except Exception as e:
                logger.error("MongoDB set_raw_weather error: %s", e)

        # In-memory storage
        self._memory_cache[f"weather:{key}"] = {"payload": payload, "created_at": now}

    async def get_analysis(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached hazard analysis result."""
        if self.is_mongo_connected and self.db is not None:
            try:
                doc = await self.db.hazard_analysis.find_one({"cache_key": key})
                if doc:
                    return doc.get("payload")
            except Exception as e:
                logger.error("MongoDB get_analysis error: %s", e)

        mem_entry = self._memory_cache.get(f"analysis:{key}")
        if mem_entry:
            return mem_entry.get("payload")
        return None

    async def set_analysis(self, key: str, payload: Dict[str, Any]):
        """Persist analysis result into NoSQL cache."""
        now = datetime.utcnow()
        if self.is_mongo_connected and self.db is not None:
            try:
                await self.db.hazard_analysis.update_one(
                    {"cache_key": key},
                    {"$set": {"cache_key": key, "payload": payload, "created_at": now}},
                    upsert=True
                )
                return
            except Exception as e:
                logger.error("MongoDB set_analysis error: %s", e)

        self._memory_cache[f"analysis:{key}"] = {"payload": payload, "created_at": now}


db_cache = CacheManager()

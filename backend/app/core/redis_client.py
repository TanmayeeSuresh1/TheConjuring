"""Redis client for caching and pub/sub."""

import redis.asyncio as aioredis
from app.core.config import settings

redis_client: aioredis.Redis = None


async def init_redis():
    global redis_client
    redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,
    )


async def get_redis() -> aioredis.Redis:
    return redis_client


async def cache_set(key: str, value: str, ttl: int = None):
    await redis_client.set(key, value, ex=ttl or settings.REDIS_CACHE_TTL)


async def cache_get(key: str) -> str | None:
    return await redis_client.get(key)


async def cache_delete(key: str):
    await redis_client.delete(key)


async def publish_event(channel: str, message: str):
    await redis_client.publish(channel, message)

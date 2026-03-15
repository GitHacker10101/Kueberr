from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from redis.asyncio import Redis

from .config import settings


class InMemoryTTLCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[float, str]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> str | None:
        async with self._lock:
            item = self._store.get(key)
            if not item:
                return None
            expires_at, payload = item
            if expires_at < time.time():
                self._store.pop(key, None)
                return None
            return payload

    async def set(self, key: str, value: str, ttl_seconds: int) -> None:
        async with self._lock:
            self._store[key] = (time.time() + ttl_seconds, value)


class CacheClient:
    def __init__(self) -> None:
        self._redis: Redis | None = None
        self._memory = InMemoryTTLCache()

    async def connect(self) -> None:
        try:
            client = Redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
                health_check_interval=30,
            )
            await asyncio.wait_for(client.ping(), timeout=1.2)
            self._redis = client
        except Exception:
            self._redis = None

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    async def get_json(self, key: str) -> dict[str, Any] | None:
        raw: str | None
        if self._redis:
            raw = await self._redis.get(key)
        else:
            raw = await self._memory.get(key)
        if not raw:
            return None
        return json.loads(raw)

    async def set_json(self, key: str, value: dict[str, Any], ttl_seconds: int) -> None:
        raw = json.dumps(value)
        if self._redis:
            await self._redis.set(key, raw, ex=ttl_seconds)
            return
        await self._memory.set(key, raw, ttl_seconds)


cache_client = CacheClient()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from typing import AsyncGenerator
from app.core.config import settings

engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True
)

SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def get_db() -> AsyncGenerator:
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()
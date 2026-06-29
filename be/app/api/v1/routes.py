from fastapi import APIRouter
from app.api.v1 import skins, meta, market_stats, tradeup

router = APIRouter(prefix="/api/v1")
router.include_router(skins.router, prefix = '/skins', tags=["skins"])
router.include_router(meta.router, prefix = '/meta', tags=["meta"])
router.include_router(market_stats.router, prefix = '/market-stats', tags=["market-stats"])
router.include_router(tradeup.router, prefix = '/tradeup', tags=["tradeup"])
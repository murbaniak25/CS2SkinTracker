from celery import Celery
from app.core.config import settings
from app.services.skin_price_service import SkinPriceService
import asyncio
from app.db.session import WorkerSession
from celery.schedules import crontab

celery_app = Celery('worker', broker = settings.REDIS_URL)

celery_app.conf.update(
    timezone = 'Europe/Warsaw',
    beat_schedule = {
        'update_prices_every_15_mins': {
        'task': 'update_prices_task',
        'schedule': crontab(minute='*/15')
        }
    }
)

@celery_app.task(name="update_prices_task")
def get_prices():
    service = SkinPriceService()

    async def run_task():
        async with WorkerSession() as db:
            print("Getting prices...\n")
            await service.update_prices(db)
            print("Updating database...\n")
            await service.calculate_historical_changes(db)
            print("Updated successfully\n")

    return asyncio.run(run_task())



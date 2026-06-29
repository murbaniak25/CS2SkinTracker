import asyncio
from app.db.session import SessionLocal
from app.services.skin_price_service import SkinPriceService


async def main():
    print("🚀 Starting full sync test...")
    service = SkinPriceService()
    async with SessionLocal() as db:
        try:
            # KROK 1: Pobieramy świeże ceny ze Skinport (tworzy rekordy w SkinPrice i SkinVariant)
            print("📦 Fetching prices from Skinport...")
            prices_count = await service.update_prices(db)
            print(f"✅ Downloaded {prices_count} prices.")

            # KROK 2: Obliczamy zmiany (teraz ma co liczyć)
            print("📊 Calculating historical changes...")
            await service.calculate_historical_changes(db)
            print(f"✅ Historical changes processed.")

        except Exception as e:
            print(f"❌ Error during test: {e}")
            await db.rollback()


if __name__ == "__main__":
    asyncio.run(main())
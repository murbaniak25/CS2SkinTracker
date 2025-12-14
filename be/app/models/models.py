import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class WearType(Base):
    __tablename__ = 'wear_types'
    wear_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)


class Rarity(Base):
    __tablename__ = 'rarities'
    rarity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    color_hex: Mapped[str] = mapped_column(String(7))


class Weapon(Base):
    __tablename__ = 'weapons'
    weapon_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)


class Collection(Base):
    __tablename__ = 'collections'
    collection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)


class Case(Base):
    __tablename__ = 'cases'
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("collections.collection_id"))
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    collection: Mapped["Collection"] = relationship()


class Skin(Base):
    __tablename__ = 'skins'
    skin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, index=True)
    image_url: Mapped[str | None] = mapped_column(String)
    float_min: Mapped[float] = mapped_column(Float, default=0.0)
    float_max: Mapped[float] = mapped_column(Float, default=1.0)

    collection_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("collections.collection_id"))
    weapon_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("weapons.weapon_id"))
    rarity_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rarities.rarity_id"))

    weapon: Mapped["Weapon"] = relationship()
    rarity: Mapped["Rarity"] = relationship()
    collection: Mapped["Collection"] = relationship()

    __table_args__ = (
        UniqueConstraint('name', 'weapon_id', name='uq_skin_weapon'),
    )


class SkinPrice(Base):
    __tablename__ = 'skin_prices'
    price_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skins.skin_id"))
    wear_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("wear_types.wear_id"))
    stattrack: Mapped[bool] = mapped_column(Boolean, default=False)
    price: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="PLN")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    skin: Mapped["Skin"] = relationship()
    wear: Mapped["WearType"] = relationship()


class User(Base):
    __tablename__ = 'users'
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    steam_id: Mapped[str] = mapped_column(String(17), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String, index=True)
    avatar_url: Mapped[str | None] = mapped_column(String)
    last_login_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    inventory: Mapped[list["UserSkin"]] = relationship(back_populates="user")


class UserSkin(Base):
    __tablename__ = 'user_skins'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.user_id"))
    skin_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("skins.skin_id"))
    wear_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("wear_types.wear_id"))

    stattrack: Mapped[bool] = mapped_column(Boolean, default=False)
    float_value: Mapped[float | None] = mapped_column(Float)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="inventory")
    skin: Mapped["Skin"] = relationship()
    wear: Mapped["WearType"] = relationship()
from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, computed_field

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_SERVER: str
    POSTGRES_PORT: int
    POSTGRES_DB: str

    REDIS_HOST: str
    REDIS_PORT: int

    #STEAM
    STEAM_OPENID_URL: str = "https://steamcommunity.com/openid/login"
    STEAM_API_KEY: str

    #JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    #FE
    FRONTEND_PORT: int

    #BE
    BACKEND_PORT: int

    @computed_field
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return str(PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        ))

    @computed_field
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @computed_field
    def FRONTEND_URL(self) -> str:
        return f"http://localhost:{self.FRONTEND_PORT}"

    @computed_field
    def BACKEND_URL(self) -> str:
        return f"http://localhost:{self.BACKEND_PORT}"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

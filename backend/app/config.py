from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Social Bloom AI"
    DATABASE_URL: str = "sqlite:///./social_bloom_ai.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
    ]

    # AI Services
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # Social Platform APIs
    FACEBOOK_ACCESS_TOKEN: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    INSTAGRAM_ACCESS_TOKEN: str = ""
    TWITTER_API_KEY: str = ""
    TWITTER_API_SECRET: str = ""

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

"""
RentalAi Configuration Settings
Uses Pydantic Settings for type-safe configuration with environment variables
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Optional
from functools import lru_cache
import json


class Settings(BaseSettings):
    """Application settings"""
    
    # ========================================================================
    # APPLICATION
    # ========================================================================
    PROJECT_NAME: str = "RentalAi"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = True
    
    # ========================================================================
    # SECURITY
    # ========================================================================
    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "https://rentalai.ai",
        "https://www.rentalai.ai",
        "https://rental-ai-frontend.vercel.app",
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            # Try to parse as JSON first
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Fall back to comma-separated
                return [origin.strip() for origin in v.split(',')]
        return v
    
    # ========================================================================
    # DATABASE
    # ========================================================================
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/rentalai"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_ECHO: bool = False  # Set to True to log SQL queries
    
    # ========================================================================
    # REDIS (Cache & Queue)
    # ========================================================================
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour default
    
    # ========================================================================
    # CELERY (Background Jobs)
    # ========================================================================
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # ========================================================================
    # FILE STORAGE
    # ========================================================================
    STORAGE_PROVIDER: str = "minio"  # minio, s3, r2, azure
    STORAGE_BUCKET: str = "rentalai-files"
    STORAGE_REGION: str = "us-east-1"
    
    # MinIO (local S3-compatible)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    
    # Cloudflare R2 (production)
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    
    # ========================================================================
    # AI SERVICES
    # ========================================================================
    AI_PROVIDER: str = "anthropic"  # anthropic, openai, azure
    
    # Anthropic (Claude)
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    
    # OpenAI (GPT-4)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_KEY: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT: Optional[str] = None
    
    # AI Settings
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.7
    AI_COST_PER_1K_TOKENS: float = 0.003  # Claude pricing
    
    # ========================================================================
    # THIRD-PARTY INTEGRATIONS
    # ========================================================================
    
    # Email (Resend)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM_ADDRESS: str = "noreply@rentalai.com"
    EMAIL_FROM_NAME: str = "RentalAi"
    
    # SMS (Twilio)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    
    # Stripe (Payments & Billing)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # DocuSign (E-Signature)
    DOCUSIGN_INTEGRATION_KEY: Optional[str] = None
    DOCUSIGN_USER_ID: Optional[str] = None
    DOCUSIGN_ACCOUNT_ID: Optional[str] = None
    DOCUSIGN_BASE_PATH: str = "https://demo.docusign.net/restapi"
    
    # Plaid (Bank Verification)
    PLAID_CLIENT_ID: Optional[str] = None
    PLAID_SECRET: Optional[str] = None
    PLAID_ENV: str = "sandbox"  # sandbox, development, production
    
    # TransUnion (Screening)
    TRANSUNION_API_KEY: Optional[str] = None
    TRANSUNION_API_SECRET: Optional[str] = None
    
    # ========================================================================
    # MONITORING & LOGGING
    # ========================================================================
    
    # Sentry (Error Tracking)
    SENTRY_DSN: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 1.0
    
    # Log Level
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    
    # ========================================================================
    # RATE LIMITING
    # ========================================================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # ========================================================================
    # FEATURE FLAGS
    # ========================================================================
    ENABLE_AI_FEATURES: bool = True
    ENABLE_EMAIL_NOTIFICATIONS: bool = True
    ENABLE_SMS_NOTIFICATIONS: bool = True
    ENABLE_WEBHOOKS: bool = True
    ENABLE_API_DOCS: bool = True
    
    # ========================================================================
    # SUBSCRIPTION LIMITS
    # ========================================================================
    FREE_TIER_MAX_PROPERTIES: int = 1
    FREE_TIER_MAX_UNITS: int = 25
    FREE_TIER_MAX_USERS: int = 2
    FREE_TIER_AI_REQUESTS_PER_MONTH: int = 100
    
    GROWTH_TIER_AI_REQUESTS_PER_MONTH: int = 1000
    
    # ========================================================================
    # PYDANTIC CONFIG
    # ========================================================================
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )
    
    # ========================================================================
    # COMPUTED PROPERTIES
    # ========================================================================
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def database_url_sync(self) -> str:
        """Convert async database URL to sync for Alembic"""
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()

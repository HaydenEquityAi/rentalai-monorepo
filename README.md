# ðŸ¢ RentalAi Backend API

AI-powered property management platform backend built with FastAPI, PostgreSQL, and advanced AI features.

## ðŸš€ Features

- **Multi-tenant Architecture** - Complete org isolation with role-based access
- **AI Document Parser** - Extract lease data from PDFs automatically
- **Smart Lead Scoring** - AI-powered tenant qualification
- **Automated Communications** - Email/SMS via Resend & Twilio
- **Stripe Payments** - Subscription billing & rent collection
- **Real-time Updates** - WebSocket support for live notifications
- **Vector Search** - pgvector for semantic document search
- **Background Jobs** - Celery for async task processing

## ðŸ“‹ Prerequisites

- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis (or use Docker)

## âš¡ Quick Start

### 1. Clone Repository
`ash
git clone https://github.com/HaydenEquityAi/rental-ai-backend.git
cd rental-ai-backend
`

### 2. Environment Setup
`ash
# Copy environment template
cp .env.example .env

# Edit environment variables
# Add your API keys for AI services, Stripe, etc.
`

### 3. Start Services
`ash
# Start PostgreSQL, Redis, and MinIO
docker-compose up -d

# Verify services are running
docker-compose ps
`

### 4. Install Dependencies
`ash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
`

### 5. Database Setup
`ash
# Run migrations
alembic upgrade head

# Seed with sample data
python scripts/seed_data.py
`

### 6. Start Application
`ash
# Development server
python app/main.py

# Or with uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
`

## ðŸ”§ Configuration

### Environment Variables

Key environment variables to configure:

`ash
# Database
DATABASE_URL=postgresql+asyncpg://rentalai:rentalai_dev_password@localhost:5432/rentalai

# AI Services
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Email/SMS
RESEND_API_KEY=your-resend-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
`

### Docker Services

- **PostgreSQL** (port 5432) - Database with pgvector extension
- **Redis** (port 6379) - Cache and Celery broker
- **MinIO** (ports 9000/9001) - S3-compatible file storage

## ðŸ“š API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## ðŸ—ï¸ Architecture

### Project Structure
`
rental-ai-backend/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ core/           # Configuration, database, security
â”‚   â”œâ”€â”€ models/         # SQLAlchemy database models
â”‚   â”œâ”€â”€ schemas/        # Pydantic request/response schemas
â”‚   â”œâ”€â”€ api/            # FastAPI route handlers
â”‚   â”œâ”€â”€ ai/             # AI client and document parser
â”‚   â”œâ”€â”€ services/       # External service integrations
â”‚   â””â”€â”€ tasks/          # Celery background tasks
â”œâ”€â”€ alembic/            # Database migrations
â”œâ”€â”€ scripts/            # Utility scripts
â”œâ”€â”€ tests/              # Test suite
â””â”€â”€ docker-compose.yml  # Local development services
`

### Key Components

- **FastAPI** - Modern, fast web framework
- **SQLAlchemy 2.0** - Async ORM with relationship mapping
- **Pydantic** - Data validation and serialization
- **Alembic** - Database migration management
- **Celery** - Background task processing
- **Redis** - Caching and message broker
- **PostgreSQL + pgvector** - Database with vector search

## ðŸ¤– AI Features

### Document Processing
- **Lease Parsing** - Extract key terms from lease documents
- **Risk Analysis** - Identify unusual clauses and red flags
- **Document Comparison** - Compare lease versions
- **Smart Summarization** - Generate concise document summaries

### Lead Management
- **Qualification Scoring** - AI-powered tenant scoring
- **Smart Matching** - Match leads to suitable properties
- **Automated Follow-up** - AI-driven communication sequences

## ðŸ” Authentication & Security

- **JWT Tokens** - Secure authentication with refresh tokens
- **Role-Based Access Control** - Granular permissions system
- **Multi-tenant Isolation** - Complete data separation
- **API Rate Limiting** - Prevent abuse and ensure fair usage
- **Password Security** - Bcrypt hashing with strength validation

## ðŸ’³ Payment Processing

### Stripe Integration
- **Subscription Management** - Automated billing cycles
- **Rent Collection** - Automated rent payments
- **Late Fee Processing** - Automatic late fee application
- **Webhook Handling** - Real-time payment status updates

### Payment Methods
- Credit/Debit Cards
- ACH Bank Transfers
- Digital Wallets

## ðŸ“§ Communication Services

### Email (Resend)
- **Transactional Emails** - Rent reminders, notices
- **Marketing Campaigns** - Lead nurturing sequences
- **Template System** - Jinja2-based email templates

### SMS (Twilio)
- **Rent Reminders** - Automated SMS notifications
- **Maintenance Updates** - Real-time status updates
- **Emergency Alerts** - Critical notifications

## ðŸ—„ï¸ Database Schema

### Core Entities
- **Organizations** - Multi-tenant top-level entities
- **Users** - Role-based user management
- **Properties** - Real estate assets
- **Units** - Individual rental units
- **Leases** - Tenant agreements
- **Payments** - Rent and fee tracking
- **Leads** - Prospective tenants
- **Work Orders** - Maintenance requests

### Relationships
- Organizations â†’ Users, Properties, Owners
- Properties â†’ Units, Work Orders
- Units â†’ Leases, Maintenance Requests
- Leases â†’ Payments, Documents

## ðŸ§ª Testing

`ash
# Run tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_models.py
`

## ðŸš€ Deployment

### Production Checklist
- [ ] Set ENVIRONMENT=production
- [ ] Configure production database
- [ ] Set up Redis cluster
- [ ] Configure file storage (S3/R2)
- [ ] Set up monitoring (Sentry)
- [ ] Configure SSL certificates
- [ ] Set up CI/CD pipeline

### Docker Production
`ash
# Build production image
docker build -t rentalai-backend .

# Run with production settings
docker run -d \
  --name rentalai-backend \
  -p 8000:8000 \
  -e ENVIRONMENT=production \
  rentalai-backend
`

## ðŸ“Š Monitoring & Logging

- **Structured Logging** - JSON-formatted logs
- **Error Tracking** - Sentry integration
- **Performance Monitoring** - Request timing middleware
- **Health Checks** - Database and service monitoring

## ðŸ¤ Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## ðŸ“„ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ðŸ†˜ Support

- **Documentation**: [API Docs](http://localhost:8000/api/docs)
- **Issues**: [GitHub Issues](https://github.com/HaydenEquityAi/rental-ai-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/HaydenEquityAi/rental-ai-backend/discussions)

## ðŸ™ Acknowledgments

- FastAPI team for the excellent framework
- SQLAlchemy team for the powerful ORM
- Anthropic and OpenAI for AI capabilities
- Stripe for payment processing
- The open-source community

---

**Built with â¤ï¸ by the RentalAi team**

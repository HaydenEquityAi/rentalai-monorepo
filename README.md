#  RentalAI Monorepo

AI-powered property management platform.

## Structure
- /backend - FastAPI backend
- /frontend - Next.js 14 frontend

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
docker-compose up -d
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
npm install
npm run dev:frontend
```

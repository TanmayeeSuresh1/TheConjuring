# SafeShare AI

Enterprise AI-powered Data Loss Prevention platform.

## Quick Start

### With Docker (recommended)
```bash
cd safeshare_ai
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/docs

### Manual
```bash
# Backend
cd safeshare_ai/backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8000

# Frontend - open in browser
# safeshare_ai/frontend/index.html
```

## Architecture
- **Frontend**: Vanilla JS + CSS (cyberpunk theme), connects to FastAPI via REST + WebSocket
- **Backend**: FastAPI + async Python, Celery workers, PostgreSQL, Redis
- **AI Pipeline**: PII Detector → NLP (spaCy/Presidio) → Anomaly (Isolation Forest) → Risk Scorer
- **OCR**: EasyOCR + Tesseract for screenshot analysis
- **URL Analysis**: ML classifier + heuristic scoring

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| POST | /api/scan/text | Scan text content |
| POST | /api/scan/image | Scan image/screenshot |
| POST | /api/scan/url | Analyze URL |
| WS   | /api/scan/live | Real-time streaming scan |
| GET  | /api/threats/history | Scan history |
| GET  | /api/dashboard/analytics | Analytics |
| GET  | /api/health | Health check |

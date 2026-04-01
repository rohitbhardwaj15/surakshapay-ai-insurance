# SmartQueue - AI-Powered Virtual Queue Optimization System

Production-ready full-stack prototype for hackathon evaluation.

## Problem Solved
Hospitals, banks, and government offices face:
- Long queues
- Time wastage
- Crowd mismanagement

SmartQueue provides:
- Dynamic token assignment
- AI waiting-time prediction
- Best-time-to-visit recommendations
- Peak-hour and load-day intelligence
- Admin analytics dashboard

## Tech Stack
- Frontend: HTML, CSS, Vanilla JS, Chart.js (Kimi-inspired UI)
- Backend: Node.js, Express
- Data: JSON store with serverless-safe in-memory fallback
- Deployment: Vercel (frontend + backend)

## Project Structure
- `backend/` - SmartQueue API service
- `surakshapay/` - Frontend single-page app

## Core API Endpoints
- `GET /health`
- `GET /api/queues`
- `GET /api/queues/:queueId`
- `POST /api/tokens/issue`
- `POST /api/queues/:queueId/serve-next`
- `POST /api/tokens/:tokenId/complete`
- `GET /api/predictions/:queueId`
- `GET /api/recommendations/:queueId`
- `GET /api/admin/analytics`

## Local Run
### 1) Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:4000`.

### 2) Frontend
Open `surakshapay/index.html` in browser and set API URL to `http://localhost:4000`.

## AI Modeling Highlights
- Wait-time prediction uses:
  - Current waiting load
  - Active counters and service-time baseline
  - Hour/day demand multipliers
  - Historical traffic correction
  - Priority-aware dynamic adjustments
- Insights generation returns statements like:
  - `Aaj 3-5 PM peak traffic hoga.`
  - `Monday highest load day hai.`

## Deployment Notes
Deploy backend and frontend as separate Vercel projects.
Set frontend API URL to backend deployment URL in the app's API field.

## Resume/Portfolio Impact
This project demonstrates:
- Data modeling and simulation
- Prediction logic and heuristics
- Dashboard/analytics visualization
- Full-stack architecture and deployment readiness

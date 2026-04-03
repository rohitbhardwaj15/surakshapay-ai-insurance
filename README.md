# SmartQueue
### AI-Powered Virtual Queue Optimization System for Hospitals, Banks, and Government Offices

SmartQueue is a full-stack, deployable hackathon prototype that reduces waiting time and improves crowd flow through:

- Smart digital token generation
- Real-time queue status tracking
- AI-based wait-time prediction
- Best-time-to-visit recommendations
- Admin analytics and peak-load insights

---

## Why This Project Matters

Public service environments still face:

- Long physical queues
- Poor citizen experience
- Unpredictable service time
- Manual crowd management
- No demand forecasting

SmartQueue converts this into a data-driven, low-friction flow where users can plan visits better and operators can manage capacity smarter.

---

## Key Features

### Citizen Side
- Request digital queue token
- View token status and estimated waiting time
- Get queue progress updates
- Receive recommendation for better visit window

### Admin Side
- Track live queue volume
- Serve next token
- Mark token completion
- View analytics across queues and time slots

### AI / Intelligence Layer
- Wait-time prediction per queue
- Demand trend and peak-hour estimation
- Best-time recommendation based on load patterns

---

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (single-page static app)
- **Backend**: Node.js + Express
- **Data Layer**: JSON datastore + serverless-safe memory fallback
- **Deployment**: Vercel (frontend and backend)

---

## Repository Structure

```text
backend/
  api/index.js
  src/app.js
  src/server.js
  src/store.js
  data/db.json
surakshapay/
  index.html
  assets/
README.md
```

---

## API Endpoints

### Health
- `GET /`
- `GET /health`

### Queue Management
- `GET /api/queues`
- `GET /api/queues/:queueId`
- `POST /api/queues`
- `PATCH /api/queues/:queueId/status`

### Token Lifecycle
- `POST /api/tokens/issue`
- `POST /api/queues/:queueId/serve-next`
- `POST /api/tokens/:tokenId/complete`
- `GET /api/tokens`

### AI Insights
- `GET /api/predictions/:queueId`
- `GET /api/recommendations/:queueId`

### Admin
- `GET /api/admin/analytics`
- `POST /api/simulate/traffic`

---

## Local Setup

### 1) Backend
```bash
cd backend
npm install
npm run dev
```
Backend starts at: `http://localhost:4000`

### 2) Frontend
Open the file directly:

- `surakshapay/index.html`

If frontend has configurable API URL field, set it to:
- `http://localhost:4000`

---

## How the AI Logic Works

The prediction/recommendation engine uses queue state and behavioral heuristics such as:

- Current waiting token count
- Active service counters
- Average service duration
- Hour-of-day traffic multipliers
- Day-of-week demand signals
- Historical trend correction

Output includes:
- Estimated wait time (minutes)
- Peak window flags
- Recommended lower-load visit slots

---

## Product Demo Flow (2 Minutes)

1. Open SmartQueue homepage
2. Select queue/service center
3. Issue a token
4. Show predicted wait and position
5. Serve next token from admin flow
6. Complete a token
7. Open admin analytics and explain peak insights
8. Highlight AI recommendation output

---

## Deployment Notes

Deploy as two Vercel services:

1. **Backend** from `backend/`
2. **Frontend** from `surakshapay/`

Set frontend API base URL to backend deployment URL.

---

## Hackathon Judging Highlights

- **Real problem relevance**: crowding + waiting-time pain
- **Practical product flow**: token -> queue -> service -> analytics
- **AI layer included**: predictive and recommendation logic
- **Operational impact**: better throughput and citizen experience
- **Deployable architecture**: full-stack and production-style

---

## Future Scope

- SMS/WhatsApp token alerts
- Multi-branch queue federation
- Role-based admin authentication
- SLA violation alerts
- Model improvements with real historical datasets

---

## Author

Built for hackathon evaluation as a production-style prototype with clear problem-solution fit, measurable impact, and deployable architecture.

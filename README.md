# SurakshaPay
## AI-Powered Parametric Micro-Insurance for Gig Delivery Partners

## Impact First (Judge Snapshot)

- **Problem addressed:** Weekly income loss for gig riders during local disruptions
- **Decision speed:** Zero-touch claim processing after trigger validation
- **Automation coverage:** Trigger -> Validation -> Claim -> Payout
- **Risk control:** AI pricing + fraud scoring + compliance exclusions
- **Fairness model:** Hyperlocal trigger validation + activity eligibility checks
- **Portfolio safety:** 70% payout cap + manual review for high fraud risk
- **Deployment readiness:** Full-stack app deployed with working APIs

---

## 1. Problem & Why It Matters

Delivery partners in Zepto/Blinkit-style ecosystems earn weekly and are highly exposed to localized disruptions:
- Heavy rain
- AQI spikes
- Heatwaves
- Curfew/flood conditions

When these events occur, earning hours drop immediately.
Traditional claim-heavy insurance flows are too slow and operationally expensive for this context.

SurakshaPay solves this with **parametric micro-insurance automation**.

---

## 2. Solution Overview

SurakshaPay is a full-stack platform that:
1. Onboards riders with city/platform/income profile
2. Computes AI risk score (0–1)
3. Calculates dynamic premium
4. Activates policy with capped coverage
5. Detects weather/disruption triggers
6. Auto-processes claim and payout
7. Runs fraud checks and review logic

---

## 3. Product Outcomes

### Rider Outcomes
- Fast onboarding
- Transparent premium and coverage
- Near-instant claim status and payout visibility
- Reduced manual claim burden

### Operator / Insurer Outcomes
- Lower claims handling overhead
- Better fraud signal visibility
- Better risk-pool control via exclusions and caps
- Scalable trigger-based adjudication

---

## 4. Core Features

### A) AI Risk & Dynamic Premium
Risk score uses:
- Weather exposure
- AQI exposure
- Heatwave exposure
- Historical disruption behavior
- Claim behavior signals

Formula:
```text
premium = base_rate x (1 + risk_score)
```

### B) Parametric Trigger Engine
Supported triggers:
- Rainfall > 35mm
- AQI > 350
- Temperature > 44°C
- Curfew alert (mock)
- Flood alert (mock)

Claim flow:
```text
Trigger -> Validate -> Claim -> Payout
```

### C) Fraud & Integrity Layer
- Geolocation mismatch checks (simulated)
- Device/session pattern checks
- Repeat-claim behavior checks
- Threshold:
  - `fraud_score > 0.75` -> Manual Review
  - else auto-process

### D) Claims Automation
- Active policy verification
- User activity eligibility check
- Income-loss estimation (hours lost)
- Auto-approval path for clean cases
- Duplicate claim prevention and safety buffers

---

## 5. Insurance Logic & Compliance Controls

### Covered
- Localized environmental disruptions
- Weather-based work interruptions
- Zone-specific shutdown effects

### Excluded
- War / armed conflict / riots
- Pandemics (e.g., COVID-19)
- Nationwide lockdowns
- Platform-wide outages
- Large-scale disasters (earthquakes, cyclones)

### Why Exclusions Exist
To maintain risk pool stability and avoid catastrophic correlated payouts.

### Moral Hazard Prevention
- Coverage capped at 70%
- No payout for inactivity before trigger
- Repeated claims monitored

### Basis Risk Handling
- Hyperlocal zone checks
- Time-aligned validation (shift window)
- Multi-factor trigger qualification

---

## 6. Product Demo Flow (2 Minutes)

1. Register rider (name, city, platform, weekly income)
2. Show AI risk score + dynamic premium on dashboard
3. Activate policy
4. Simulate trigger (e.g., rain/AQI)
5. Show claim auto-processed
6. Display payout + fraud status
7. Open admin overview for risk and payout visibility

---

## 7. Technology Stack

- **Frontend:** React-based integrated UI
- **Backend:** Node.js + Express
- **Data Layer:** JSON store + serverless-safe runtime fallback
- **Deployment:** Vercel (frontend + backend)

---

## 8. Architecture (High Level)

```text
Frontend UI
   |
   v
API Layer (Express)
   |
   +--> Policy Engine
   +--> Risk/Premium Engine
   +--> Trigger Engine
   +--> Claim Automation Engine
   +--> Fraud Scoring Engine
   |
   v
Data Store (Users, Policies, Claims, Risk Scores, Triggers)
```

---

## 9. Repository Structure

```text
backend/
  api/index.js
  src/app.js
  src/engine.js
  src/store.js
  src/server.js
  data/db.json

surakshapay/
  index.html
  assets/

README.md
```

---

## 10. API Highlights

- `GET /health`
- `POST /api/users/register`
- `POST /api/policies/create/:userId`
- `PATCH /api/policies/:policyId/status`
- `POST /api/triggers/simulate`
- `GET /api/dashboard/:userId`
- `GET /api/claims/:userId`
- `GET /api/fraud/:userId`
- `GET /api/admin/overview`

Compatibility routes available for integrated UI contract:
- `POST /api/policies/:policyId/activate`
- `POST /api/policies/:policyId/deactivate`
- `GET /api/claims?userId=...`
- `GET /api/fraud-check/:userId`
- `GET /api/admin/stats`
- `GET /api/admin/risk-heatmap`

---

## 11. Local Setup

### Backend
```bash
cd backend
npm install
npm run dev
```
Runs on `http://localhost:4000`

### Frontend
Serve/open `surakshapay/` and point API base URL to backend.

---

## 12. Live Deployment

- Frontend: `https://surakshapay-beige.vercel.app`
- Backend: `https://backend-six-theta-80.vercel.app`

---

## 13. Why This Project Is Judge-Worthy

- Strong **problem-solution fit** for gig economy
- Real **insurance logic**, not just UI simulation
- End-to-end **automation** with measurable operational value
- Balanced with **compliance and fraud safeguards**
- Built and deployed as a **production-style prototype**

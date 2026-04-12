import crypto from "crypto";
import cors   from "cors";
import express from "express";

import { readDB, updateDB } from "./store.js";
import {
  calculateRiskScore,
  calculatePremium,
  getBehavioralDiscount,
  evaluateTrigger,
  processClaimAutomation,
  simulatePayout,
  getWorkRecommendation,
  getAdaptiveCoverage,
  buildAdminAnalytics,
  getAdminStats
} from "./engine.js";

const app = express();

app.use(cors());
app.use(express.json());

function nowIso() {
  return new Date().toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT & HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/", (_req, res) => {
  res.json({
    service: "SurakshaPay Backend API",
    status:  "ok",
    version: "2.0.0",
    docs: {
      health:           "/health",
      register:         "POST /api/users/register",
      dashboard:        "GET  /api/dashboard/:userId",
      activatePolicy:   "POST /api/policy/activate",
      simulateTrigger:  "POST /api/trigger/simulate",
      getTriggers:      "GET  /api/triggers",
      processClaim:     "POST /api/claim/process",
      getClaims:        "GET  /api/claims",
      recommendation:   "GET  /api/recommendation/:userId",
      adminAnalytics:   "GET  /api/admin/analytics"
    },
    time: nowIso()
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "SurakshaPay", time: nowIso() });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RIDER REGISTRATION
// POST /api/users/register
// Body: { name, city, platform, weeklyIncome, phone? }
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/users/register", (req, res) => {
  const { name, city, platform, weeklyIncome, phone } = req.body;

  if (!name || !city || !platform || !weeklyIncome) {
    return res.status(400).json({
      error: "name, city, platform, and weeklyIncome are required."
    });
  }

  const rider = updateDB((db) => {
    const riskScore        = calculateRiskScore({ city, weeklyIncome });
    const basePremium      = calculatePremium({ riskScore, weeklyIncome });
    const behavDiscount    = getBehavioralDiscount({ claimsHistory: [] });
    const premium          = Math.max(1, basePremium - behavDiscount);
    const coverage         = Math.round(Number(weeklyIncome) * 0.70); // 70% cap

    const newRider = {
      id:                 crypto.randomUUID(),
      name,
      city,
      platform,
      weeklyIncome:       Number(weeklyIncome),
      phone:              phone || "",
      riskScore,
      basePremium,
      behavioralDiscount: behavDiscount,
      premium,
      coverage,
      claimsHistory:      [],
      hoursWorked:        [],
      createdAt:          nowIso()
    };

    db.riders.push(newRider);
    return newRider;
  });

  res.status(201).json(rider);
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// GET /api/dashboard/:userId
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/dashboard/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();

  const rider = db.riders.find((r) => r.id === userId);
  if (!rider) return res.status(404).json({ error: "Rider not found." });

  const policy         = db.policies.find((p) => p.riderId === userId && p.status === "active") || null;
  const claims         = db.claims.filter((c) => c.riderId === userId);
  const triggers       = db.triggers;
  const recommendation = getWorkRecommendation({ rider, triggers });
  const adaptiveCoverage = policy ? getAdaptiveCoverage({ rider, policy, triggers }) : null;

  res.json({ rider, policy, claims, triggers, recommendation, adaptiveCoverage });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LIST ALL RIDERS (admin)
// GET /api/users
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/users", (_req, res) => {
  const db = readDB();
  res.json(db.riders);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVATE POLICY
// POST /api/policy/activate
// Body: { userId }
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/policy/activate", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const result = updateDB((db) => {
    const rider = db.riders.find((r) => r.id === userId);
    if (!rider) return { error: "Rider not found." };

    const existing = db.policies.find((p) => p.riderId === userId && p.status === "active");
    if (existing) return { error: "Policy already active.", policy: existing };

    const policy = {
      id:           crypto.randomUUID(),
      riderId:      userId,
      riderName:    rider.name,
      city:         rider.city,
      platform:     rider.platform,
      weeklyIncome: rider.weeklyIncome,
      coverage:     rider.coverage,
      premium:      rider.premium,
      riskScore:    rider.riskScore,
      status:       "active",
      activatedAt:  nowIso(),
      expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    db.policies.push(policy);
    return { policy };
  });

  if (result.error) return res.status(400).json({ error: result.error, policy: result.policy || null });
  res.status(201).json(result.policy);
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALL TRIGGERS
// GET /api/triggers
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/triggers", (_req, res) => {
  const db = readDB();
  res.json(db.triggers);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATE TRIGGER
// POST /api/trigger/simulate
// Body: { triggerType, value }
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/trigger/simulate", (req, res) => {
  const { triggerType, value } = req.body;
  if (!triggerType) return res.status(400).json({ error: "triggerType is required." });

  const result = updateDB((db) => {
    const trigger = db.triggers.find((t) => t.type === triggerType);
    if (!trigger) return null;

    trigger.value           = Number(value ?? trigger.value);
    trigger.active          = evaluateTrigger(trigger);
    trigger.lastSimulatedAt = nowIso();
    return { ...trigger };
  });

  if (!result) return res.status(404).json({ error: `Trigger type '${triggerType}' not found.` });
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESET ALL TRIGGERS
// POST /api/trigger/reset
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/trigger/reset", (_req, res) => {
  updateDB((db) => {
    db.triggers.forEach((t) => {
      t.active = false;
      t.value  = t.type === "curfew" || t.type === "flood" ? 0 : 10;
    });
  });
  const db = readDB();
  res.json({ message: "All triggers reset.", triggers: db.triggers });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS CLAIM
// POST /api/claim/process
// Body: { userId }
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/claim/process", (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  const result = updateDB((db) => {
    const rider = db.riders.find((r) => r.id === userId);
    if (!rider) return { error: "Rider not found." };

    const policy = db.policies.find((p) => p.riderId === userId && p.status === "active");
    if (!policy) return { error: "No active policy found. Please activate a policy first." };

    const activeTriggers = db.triggers.filter((t) => t.active);
    if (activeTriggers.length === 0) {
      return { error: "No active environmental triggers detected. Claims require at least one active trigger." };
    }

    const claimResult = processClaimAutomation({ rider, policy, activeTriggers });

    const claim = {
      id:           crypto.randomUUID(),
      riderId:      userId,
      policyId:     policy.id,
      riderName:    rider.name,
      city:         rider.city,
      triggers:     activeTriggers.map((t) => t.label),
      incomeLoss:   claimResult.incomeLoss,
      payoutAmount: claimResult.payoutAmount,
      fraudScore:   claimResult.fraudScore,
      status:       claimResult.status,
      decision:     claimResult.decision,
      processedAt:  nowIso()
    };
    claim.payout = simulatePayout(claim.payoutAmount);

    db.claims.push(claim);

    // Update rider behavioral profile
    rider.claimsHistory.push({
      claimId: claim.id,
      amount:  claim.payoutAmount,
      status:  claim.status,
      date:    nowIso()
    });

    // Recalculate behavioral discount after each claim
    const behavDiscount    = getBehavioralDiscount({ claimsHistory: rider.claimsHistory });
    rider.behavioralDiscount = behavDiscount;
    rider.premium            = Math.max(1, rider.basePremium - behavDiscount);

    return claim;
  });

  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json(result);
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALL CLAIMS (admin)
// GET /api/claims
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/claims", (_req, res) => {
  const db = readDB();
  res.json(db.claims);
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORK RECOMMENDATION
// GET /api/recommendation/:userId
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/recommendation/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();

  const rider = db.riders.find((r) => r.id === userId);
  if (!rider) return res.status(404).json({ error: "Rider not found." });

  res.json(getWorkRecommendation({ rider, triggers: db.triggers }));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE COVERAGE
// GET /api/coverage/:userId
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/coverage/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();

  const rider  = db.riders.find((r) => r.id === userId);
  if (!rider) return res.status(404).json({ error: "Rider not found." });

  const policy = db.policies.find((p) => p.riderId === userId && p.status === "active");
  if (!policy) return res.status(404).json({ error: "No active policy found." });

  res.json(getAdaptiveCoverage({ rider, policy, triggers: db.triggers }));
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS
// GET /api/admin/analytics
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/admin/analytics", (_req, res) => {
  const db = readDB();
  res.json(buildAdminAnalytics({
    riders:   db.riders,
    policies: db.policies,
    claims:   db.claims,
    triggers: db.triggers
  }));
});

app.get("/api/admin/stats", (_req, res) => {
  const db = readDB();
  const stats = getAdminStats({
    users: db.riders,
    policies: db.policies,
    claims: db.claims
  });
  res.json(stats);
});

export default app;

import crypto from "crypto";
import express from "express";
import cors from "cors";
import {
  basisRiskValidation,
  calculatePremium,
  calculateRiskScore,
  checkExclusion,
  computeCoverage,
  estimatePayout,
  fraudScoreForClaim,
  isActivityEligible,
  isTriggerQualified,
  shouldManualReview
} from "./engine.js";
import { readDB, updateDB } from "./store.js";

const app = express();

app.use(cors());
app.use(express.json());

function now() {
  return new Date().toISOString();
}

function getUser(db, userId) {
  return db.users.find((u) => u.id === userId);
}

function getPolicyByUser(db, userId) {
  return db.policies.find((p) => p.userId === userId);
}

app.get("/", (_req, res) => {
  res.json({
    service: "SurakshaPay Backend API",
    status: "ok",
    docs: {
      health: "/health",
      register: "/api/users/register",
      dashboard: "/api/dashboard/:userId"
    },
    time: now()
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "SurakshaPay API", time: now() });
});

app.post("/api/users/register", (req, res) => {
  const { name, city, platform, weeklyIncome } = req.body;
  if (!name || !city || !platform || !weeklyIncome) {
    return res.status(400).json({ error: "name, city, platform and weeklyIncome are required." });
  }

  const user = updateDB((db) => {
    const id = crypto.randomUUID();
    const profile = {
      id,
      name,
      city,
      platform,
      weeklyIncome: Number(weeklyIncome),
      zone: `${city.toLowerCase()}-central`,
      deviceId: `dev_${crypto.randomUUID().slice(0, 8)}`,
      lastActiveAt: now(),
      createdAt: now()
    };
    db.users.push(profile);
    return profile;
  });

  return res.status(201).json(user);
});

app.post("/api/policies/create/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const user = getUser(db, userId);
  if (!user) return res.status(404).json({ error: "User not found." });

  const existing = getPolicyByUser(db, userId);
  if (existing) return res.json(existing);

  const claimHistory = db.claims.filter((c) => c.userId === userId);
  const suspiciousCount = claimHistory.filter((c) => c.fraudScore > 0.5).length;
  const riskScore = calculateRiskScore({
    city: user.city,
    claimCount: claimHistory.length,
    suspiciousCount
  });
  const premium = calculatePremium(user.weeklyIncome, riskScore);
  const coverageAmount = computeCoverage(user.weeklyIncome);

  const policy = updateDB((mutable) => {
    const created = {
      id: crypto.randomUUID(),
      userId,
      riskScore,
      premium,
      coverageAmount,
      status: "Inactive",
      exclusions: [
        "War / Armed Conflict / Riots",
        "Pandemics (e.g., COVID-19)",
        "Nationwide lockdowns",
        "Platform-wide outages",
        "Large-scale disasters (earthquakes, cyclones)"
      ],
      complianceNotes: {
        moralHazard: "Coverage capped at 70%; no payout for inactivity before trigger; repeated claims monitored.",
        basisRisk: "Zone-based and shift-time aligned trigger validation with multi-factor checks.",
        failSafe: "Verification buffer, duplicate-claim lock, and manual review for high fraud score."
      },
      createdAt: now(),
      updatedAt: now()
    };

    mutable.policies.push(created);
    mutable.riskScores.push({
      id: crypto.randomUUID(),
      userId,
      value: riskScore,
      generatedAt: now()
    });
    return created;
  });

  return res.status(201).json(policy);
});

app.patch("/api/policies/:policyId/status", (req, res) => {
  const { policyId } = req.params;
  const { status } = req.body;
  if (!["Active", "Inactive"].includes(status)) {
    return res.status(400).json({ error: "status must be Active or Inactive." });
  }

  const updated = updateDB((db) => {
    const policy = db.policies.find((p) => p.id === policyId);
    if (!policy) return null;
    policy.status = status;
    policy.updatedAt = now();
    return policy;
  });

  if (!updated) return res.status(404).json({ error: "Policy not found." });
  return res.json(updated);
});

app.post("/api/activity/:userId", (req, res) => {
  const { userId } = req.params;
  const { deviceId } = req.body;

  const updated = updateDB((db) => {
    const user = getUser(db, userId);
    if (!user) return null;
    user.lastActiveAt = now();
    if (deviceId) user.deviceId = deviceId;
    return user;
  });

  if (!updated) return res.status(404).json({ error: "User not found." });
  return res.json({ success: true, lastActiveAt: updated.lastActiveAt });
});

app.get("/api/dashboard/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const user = getUser(db, userId);
  const policy = getPolicyByUser(db, userId);
  const claims = db.claims.filter((c) => c.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (!user) return res.status(404).json({ error: "User not found." });
  if (!policy) return res.status(404).json({ error: "Policy not found. Create policy first." });

  return res.json({
    user,
    policy,
    latestClaim: claims[0] ?? null,
    claimCount: claims.length
  });
});

app.get("/api/policies/user/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const policy = getPolicyByUser(db, userId);
  if (!policy) return res.status(404).json({ error: "Policy not found." });
  return res.json(policy);
});

app.post("/api/triggers/simulate", (req, res) => {
  const { type, city } = req.body;
  if (!type || !city) return res.status(400).json({ error: "type and city are required." });

  const payload = {
    id: crypto.randomUUID(),
    type,
    city,
    rainfallMm: req.body.rainfallMm ?? (type === "rain" ? 42 : 0),
    aqi: req.body.aqi ?? (type === "aqi" ? 380 : 120),
    temperatureC: req.body.temperatureC ?? (type === "heatwave" ? 46 : 33),
    curfewAlert: req.body.curfewAlert ?? type === "curfew",
    floodAlert: req.body.floodAlert ?? type === "flood",
    timeAlignedWithShift: req.body.timeAlignedWithShift ?? true,
    triggeredAt: now(),
    verificationBufferSeconds: 45
  };

  if (checkExclusion(type)) {
    return res.status(422).json({ error: "This event type is excluded from coverage." });
  }
  if (!isTriggerQualified(payload)) {
    return res.status(422).json({ error: "Trigger threshold not met." });
  }

  const summary = updateDB((db) => {
    db.triggers.push(payload);
    const usersInCity = db.users.filter((u) => u.city === city);
    const processedClaims = [];

    for (const user of usersInCity) {
      const policy = getPolicyByUser(db, user.id);
      if (!policy || policy.status !== "Active") continue;

      const duplicateClaim = db.claims.some(
        (claim) => claim.userId === user.id && claim.triggerType === type && claim.claimWindowId === payload.id
      );
      if (duplicateClaim) continue;

      const eligibleByActivity = isActivityEligible(user.lastActiveAt);
      const validBasisRisk = basisRiskValidation(payload, user);
      const claimsLast30d = db.claims.filter((c) => {
        if (c.userId !== user.id) return false;
        const delta = Date.now() - new Date(c.createdAt).getTime();
        return delta <= 1000 * 60 * 60 * 24 * 30;
      }).length;

      const fraudScore = fraudScoreForClaim({
        user,
        triggerCity: city,
        claimCountLast30d: claimsLast30d,
        duplicateAttempt: duplicateClaim,
        expectedDeviceId: req.body.deviceId || user.deviceId
      });

      const payoutDetails = estimatePayout(user.weeklyIncome, policy.coverageAmount, type);
      const manualReview = shouldManualReview(fraudScore);
      const policyActive = policy.status === "Active";

      let status = "Rejected";
      let reason = "Activity criteria not met before trigger.";
      if (!policyActive) reason = "Policy inactive.";
      else if (!validBasisRisk) reason = "Basis risk checks failed.";
      else if (manualReview) {
        status = "Pending";
        reason = "High fraud score; sent for manual review.";
      } else if (eligibleByActivity) {
        status = "Approved";
        reason = "Auto-processed";
      }

      const claim = {
        id: crypto.randomUUID(),
        userId: user.id,
        policyId: policy.id,
        triggerType: type,
        triggerSnapshot: payload,
        claimWindowId: payload.id,
        status,
        payoutAmount: status === "Approved" ? payoutDetails.payout : 0,
        estimatedLoss: payoutDetails.estimatedLoss,
        hoursLost: payoutDetails.hoursLost,
        fraudScore,
        fraudStatus: manualReview ? "Under Review" : "Fraud Check Passed",
        reason,
        createdAt: now(),
        processedAt: now(),
        verificationReadyAt: new Date(Date.now() + payload.verificationBufferSeconds * 1000).toISOString()
      };

      db.claims.push(claim);
      processedClaims.push(claim);
    }

    return {
      trigger: payload,
      processedClaims,
      claimCount: processedClaims.length
    };
  });

  return res.status(201).json(summary);
});

app.get("/api/triggers/latest/:city", (req, res) => {
  const { city } = req.params;
  const db = readDB();
  const latest = [...db.triggers]
    .filter((t) => t.city.toLowerCase() === city.toLowerCase())
    .sort((a, b) => (a.triggeredAt < b.triggeredAt ? 1 : -1))[0];
  return res.json(latest ?? null);
});

app.get("/api/claims/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const claims = db.claims.filter((c) => c.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return res.json(claims);
});

app.get("/api/fraud/:userId", (req, res) => {
  const { userId } = req.params;
  const db = readDB();
  const claims = db.claims.filter((c) => c.userId === userId);
  const latest = claims.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  return res.json({
    userId,
    latestFraudScore: latest?.fraudScore ?? 0,
    status: latest?.fraudStatus ?? "Fraud Check Passed",
    signalSummary:
      latest?.fraudScore > 0.75
        ? "Location/device/claim pattern anomaly detected."
        : "No suspicious claim pattern detected."
  });
});

app.get("/api/admin/overview", (_req, res) => {
  const db = readDB();
  const approved = db.claims.filter((c) => c.status === "Approved");
  const underReview = db.claims.filter((c) => c.status === "Pending");
  const totalPayout = approved.reduce((sum, c) => sum + c.payoutAmount, 0);

  return res.json({
    totals: {
      users: db.users.length,
      activePolicies: db.policies.filter((p) => p.status === "Active").length,
      claims: db.claims.length,
      underReview: underReview.length,
      totalPayout: Number(totalPayout.toFixed(2))
    },
    fraudAlerts: underReview.slice(0, 20),
    riskHeatmap: db.users.map((u) => ({
      city: u.city,
      userId: u.id,
      riskScore: db.policies.find((p) => p.userId === u.id)?.riskScore ?? 0
    }))
  });
});

export default app;

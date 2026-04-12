// ═══════════════════════════════════════════════════════════════════════════════
// SurakshaPay AI Engine
// Handles: risk scoring, premium calc, trigger eval, claim automation,
//          fraud detection, behavioral discounts, work recommendations,
//          adaptive coverage, and admin analytics.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constants ────────────────────────────────────────────────────────────────
const HIGH_RISK_CITIES = ["Mumbai", "Chennai", "Kolkata", "Patna", "Bhopal", "Lucknow", "Ahmedabad"];
const BASE_PREMIUM_RATE = 0.04; // 4% of weekly income base

function clamp(min, val, max) {
  return Math.max(min, Math.min(val, max));
}

// ─── 1. Risk Score (0.0 – 1.0) ────────────────────────────────────────────────
// Combines city exposure + income band + historical disruption weight
export function calculateRiskScore({ city, weeklyIncome }) {
  let score = 0.25; // baseline risk

  // City-level weather / disruption exposure
  if (HIGH_RISK_CITIES.includes(city)) score += 0.20;
  else                                  score += 0.10;

  // Income band: lower income → higher relative vulnerability
  const income = Number(weeklyIncome);
  if      (income < 3000)  score += 0.30;
  else if (income < 5000)  score += 0.20;
  else if (income < 8000)  score += 0.10;
  else                     score += 0.05;

  return parseFloat(clamp(0, score, 1).toFixed(3));
}

// ─── 2. Dynamic Premium Calculation ──────────────────────────────────────────
// Formula: base_rate × weeklyIncome × (1 + riskScore)
export function calculatePremium({ riskScore, weeklyIncome }) {
  const income  = Number(weeklyIncome);
  const premium = income * BASE_PREMIUM_RATE * (1 + riskScore);
  return Math.round(premium);
}

// ─── 3. Behavioral Discount / Surcharge (₹ amount) ───────────────────────────
// Consistent, no-claim history → discount; repeated claims → surcharge
export function getBehavioralDiscount({ claimsHistory = [] }) {
  const count = claimsHistory.length;
  if (count === 0) return 10;   // ₹10 discount — no claims ever
  if (count === 1) return 5;    // ₹5 discount  — single claim, still good
  if (count === 2) return 0;    // no change
  if (count >= 3)  return -20;  // ₹20 surcharge — repeated claimant
  return 0;
}

// ─── 4. Trigger Evaluation ────────────────────────────────────────────────────
// Returns true if the trigger threshold is crossed
export function evaluateTrigger(trigger) {
  return Number(trigger.value) >= Number(trigger.threshold);
}

// ─── 5. Fraud Scoring (0.0 – 1.0) ────────────────────────────────────────────
// Combines: recent claim velocity + inactivity before trigger + weak trigger combo
function computeFraudScore({ rider, activeTriggers }) {
  let score = 0.05; // base

  // Velocity: claims within last 14 days
  const now = Date.now();
  const recentClaims = (rider.claimsHistory || []).filter((c) => {
    const age = (now - new Date(c.date).getTime()) / 86400000;
    return age <= 14;
  });
  if      (recentClaims.length >= 3) score += 0.50;
  else if (recentClaims.length === 2) score += 0.30;
  else if (recentClaims.length === 1) score += 0.15;

  // Inactivity signal: no recorded hours in last 3 days
  const recentHours = (rider.hoursWorked || []).filter((h) => {
    const age = (now - new Date(h.date).getTime()) / 86400000;
    return age <= 3;
  });
  if (recentHours.length === 0) score += 0.25;

  // Weak trigger: only a temperature trigger with no secondary
  if (activeTriggers.length === 1 && activeTriggers[0].type === "temperature") {
    score += 0.10;
  }

  return parseFloat(clamp(0, score, 1).toFixed(3));
}

// ─── 6. Claim Automation ─────────────────────────────────────────────────────
// Runs full parametric claim pipeline: validate → score → decide → payout
export function processClaimAutomation({ rider, policy, activeTriggers }) {
  const fraudScore = computeFraudScore({ rider, activeTriggers });

  // Income loss estimate: 25% per trigger, capped at 70% (moral hazard guard)
  const lossFactor   = clamp(0.25, 0.25 + (activeTriggers.length - 1) * 0.10, 0.70);
  const incomeLoss   = Math.round(rider.weeklyIncome * lossFactor);
  const payoutAmount = Math.min(incomeLoss, policy.coverage);

  if (fraudScore > 0.75) {
    return {
      fraudScore,
      incomeLoss,
      payoutAmount: 0,
      status:   "manual_review",
      decision: `⚠️ Fraud score ${fraudScore} exceeds threshold. Claim flagged for manual review.`
    };
  }

  return {
    fraudScore,
    incomeLoss,
    payoutAmount,
    status:   "approved",
    decision: `✅ Auto-approved. Payout of ₹${payoutAmount} scheduled within 24 hours.`
  };
}

// ─── 7. Work Time Recommendation ─────────────────────────────────────────────
// AI-driven slot suggestions based on active triggers + time of day
export function getWorkRecommendation({ rider, triggers }) {
  const activeTriggers = (triggers || []).filter((t) => t.active);
  const hour = new Date().getHours();

  if (activeTriggers.length > 0) {
    return {
      recommendation: "🚨 Environmental disruption active. Avoid working until conditions clear.",
      riskLevel:      "high",
      bestSlot:       "Re-check in 2–3 hours once trigger conditions normalise.",
      activeTriggers: activeTriggers.map((t) => t.label)
    };
  }

  // Prime earning windows
  const isMorningPeak = hour >= 6  && hour <= 9;
  const isEveningPeak = hour >= 18 && hour <= 21;
  const isMidday      = hour >= 12 && hour <= 16;

  if (isMorningPeak || isEveningPeak) {
    return {
      recommendation: "✅ Excellent conditions — low risk, high demand window active now.",
      riskLevel:      "low",
      bestSlot:       `${hour}:00–${hour + 3}:00 is an optimal earning slot.`,
      activeTriggers: []
    };
  }

  if (isMidday) {
    return {
      recommendation: "⚠️ Midday: lower order volume and elevated heat exposure.",
      riskLevel:      "medium",
      bestSlot:       "Consider the 6–9 PM window for safer, higher-demand conditions.",
      activeTriggers: []
    };
  }

  return {
    recommendation: "📊 Conditions are stable. No environmental alerts detected.",
    riskLevel:      "low",
    bestSlot:       "Tomorrow 6–10 PM predicted as low-risk, high-demand window.",
    activeTriggers: []
  };
}

// ─── 8. Adaptive Coverage Engine ─────────────────────────────────────────────
// Dynamically adjusts coverage & premium based on real-time trigger conditions
export function getAdaptiveCoverage({ rider, policy, triggers }) {
  const activeTriggers = (triggers || []).filter((t) => t.active);
  let coverage = policy.coverage;
  let premium  = policy.premium;
  let note     = "Coverage is at standard level. No active triggers.";

  const hasRainOrFlood = activeTriggers.some((t) => ["rainfall", "flood"].includes(t.type));
  const hasAQI         = activeTriggers.some((t) => t.type === "aqi");
  const hasHeat        = activeTriggers.some((t) => t.type === "temperature");

  if (hasRainOrFlood) {
    coverage = Math.round(coverage * 1.15);
    premium  = Math.round(premium  * 1.05);
    note     = "🌧️ Rain/flood detected — coverage +15%, premium adjusted +5% for sustainability.";
  } else if (hasAQI) {
    coverage = Math.round(coverage * 1.10);
    note     = "😷 High AQI — coverage +10%. Stay safe.";
  } else if (hasHeat) {
    coverage = Math.round(coverage * 1.08);
    note     = "🥵 Heatwave alert — coverage +8%. Limit outdoor hours.";
  }

  return {
    coverage,
    premium,
    note,
    activeTriggers: activeTriggers.map((t) => t.label)
  };
}

// ─── 9. Admin Analytics ───────────────────────────────────────────────────────
export function buildAdminAnalytics({ riders, policies, claims, triggers }) {
  const activePolicies  = policies.filter((p) => p.status === "active").length;
  const totalClaims     = claims.length;
  const approvedClaims  = claims.filter((c) => c.status === "approved").length;
  const manualReviews   = claims.filter((c) => c.status === "manual_review").length;
  const rejectedClaims  = claims.filter((c) => c.status === "rejected").length;
  const totalPayout     = claims
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + (c.payoutAmount || 0), 0);

  const avgRiskScore = riders.length > 0
    ? parseFloat((riders.reduce((s, r) => s + r.riskScore, 0) / riders.length).toFixed(3))
    : 0;

  const activeTriggers = (triggers || []).filter((t) => t.active).map((t) => t.label);

  return {
    summary: {
      totalRiders:     riders.length,
      activePolicies,
      totalClaims,
      approvedClaims,
      manualReviews,
      rejectedClaims,
      totalPayout,
      avgRiskScore,
      fraudDetectionRate: totalClaims > 0
        ? `${((manualReviews / totalClaims) * 100).toFixed(1)}%`
        : "0%"
    },
    activeTriggers,
    recentClaims: claims.slice(-5).reverse()
  };
}

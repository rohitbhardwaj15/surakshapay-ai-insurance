const CITY_RISK_MAP = {
  Mumbai: { weather: 0.78, aqi: 0.58, heatwave: 0.42, disruption: 0.68 },
  Delhi: { weather: 0.52, aqi: 0.88, heatwave: 0.75, disruption: 0.64 },
  Bengaluru: { weather: 0.57, aqi: 0.38, heatwave: 0.45, disruption: 0.44 },
  Kolkata: { weather: 0.66, aqi: 0.59, heatwave: 0.62, disruption: 0.61 },
  Hyderabad: { weather: 0.48, aqi: 0.44, heatwave: 0.66, disruption: 0.52 }
};

const EXCLUDED_EVENTS = [
  "war",
  "armed_conflict",
  "riot",
  "pandemic",
  "nationwide_lockdown",
  "platform_outage",
  "earthquake",
  "cyclone"
];

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

function to2(num) {
  return Number(num.toFixed(2));
}

function getCityFactors(city) {
  return CITY_RISK_MAP[city] ?? { weather: 0.5, aqi: 0.45, heatwave: 0.5, disruption: 0.4 };
}

export function calculateRiskScore({ city, claimCount = 0, suspiciousCount = 0 }) {
  const factors = getCityFactors(city);
  const claimBehavior = clamp(0, 0.25 + claimCount * 0.08 + suspiciousCount * 0.12, 1);

  const weighted =
    factors.weather * 0.28 +
    factors.aqi * 0.24 +
    factors.heatwave * 0.2 +
    factors.disruption * 0.18 +
    claimBehavior * 0.1;

  return clamp(0, to2(weighted), 1);
}

export function calculatePremium(weeklyIncome, riskScore) {
  const baseRate = weeklyIncome * 0.04;
  const premium = baseRate * (1 + riskScore);
  return {
    baseRate: to2(baseRate),
    riskMultiplier: to2(1 + riskScore),
    weeklyPremium: to2(premium)
  };
}

export function computeCoverage(weeklyIncome) {
  return to2(weeklyIncome * 0.7);
}

export function checkExclusion(triggerType) {
  return EXCLUDED_EVENTS.includes(triggerType);
}

export function isTriggerQualified(payload) {
  if (payload.type === "rain") return payload.rainfallMm > 35;
  if (payload.type === "aqi") return payload.aqi > 350;
  if (payload.type === "heatwave") return payload.temperatureC > 44;
  if (payload.type === "curfew") return payload.curfewAlert === true;
  if (payload.type === "flood") return payload.floodAlert === true;
  return false;
}

export function estimateHoursLost(triggerType) {
  const map = {
    rain: 8,
    aqi: 9,
    heatwave: 7,
    curfew: 10,
    flood: 12
  };
  return map[triggerType] ?? 6;
}

export function estimatePayout(weeklyIncome, coverageAmount, triggerType) {
  const hoursLost = estimateHoursLost(triggerType);
  const weeklyWorkHours = 48;
  const estimatedLoss = (weeklyIncome * hoursLost) / weeklyWorkHours;
  const payout = Math.min(estimatedLoss, coverageAmount);
  return {
    hoursLost,
    estimatedLoss: to2(estimatedLoss),
    payout: to2(payout)
  };
}

export function fraudScoreForClaim({
  user,
  triggerCity,
  claimCountLast30d,
  duplicateAttempt,
  expectedDeviceId
}) {
  const locationMismatch = user.city !== triggerCity ? 0.45 : 0;
  const repeatedClaims = claimCountLast30d >= 3 ? 0.25 : claimCountLast30d * 0.07;
  const duplicatePenalty = duplicateAttempt ? 0.35 : 0;

  const lastActiveMs = Date.now() - new Date(user.lastActiveAt).getTime();
  const inactivePenalty = lastActiveMs > 1000 * 60 * 60 * 24 ? 0.2 : 0;

  const deviceMismatch = expectedDeviceId && user.deviceId !== expectedDeviceId ? 0.22 : 0;
  const score = clamp(0, locationMismatch + repeatedClaims + duplicatePenalty + inactivePenalty + deviceMismatch, 1);
  return to2(score);
}

export function isActivityEligible(lastActiveAt) {
  const maxWindow = 1000 * 60 * 60 * 18;
  return Date.now() - new Date(lastActiveAt).getTime() <= maxWindow;
}

export function shouldManualReview(fraudScore) {
  return fraudScore > 0.75;
}

export function basisRiskValidation(triggerPayload, user) {
  const validZone = triggerPayload.city === user.city;
  const validWindow = Boolean(triggerPayload.timeAlignedWithShift);
  return validZone && validWindow;
}

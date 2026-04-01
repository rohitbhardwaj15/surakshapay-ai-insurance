const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DAY_MULTIPLIERS = {
  Sunday: 0.82,
  Monday: 1.25,
  Tuesday: 1.08,
  Wednesday: 1.04,
  Thursday: 1.12,
  Friday: 1.18,
  Saturday: 0.9
};

function clamp(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

function round(value, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getDayName(inputDate = new Date()) {
  return DAY_ORDER[new Date(inputDate).getDay()];
}

export function getDemandMultiplier(dayName, hour) {
  const dayMultiplier = DAY_MULTIPLIERS[dayName] ?? 1;
  let hourMultiplier = 1;

  if (hour >= 10 && hour <= 12) hourMultiplier = 1.35;
  else if (hour >= 15 && hour <= 17) hourMultiplier = 1.48;
  else if (hour >= 8 && hour <= 9) hourMultiplier = 0.88;
  else if (hour >= 18) hourMultiplier = 0.72;

  return round(dayMultiplier * hourMultiplier, 3);
}

export function getQueueLogs(trafficLogs, queueId, lastDays = 60) {
  const cutoff = Date.now() - lastDays * 24 * 60 * 60 * 1000;
  return trafficLogs.filter((log) => log.queueId === queueId && new Date(log.timestamp).getTime() >= cutoff);
}

export function predictWaitTime({ queue, tokens, trafficLogs, requestDate = new Date(), priority = 0 }) {
  const date = new Date(requestDate);
  const dayName = getDayName(date);
  const hour = date.getHours();

  const waitingTokens = tokens.filter((token) => token.queueId === queue.id && token.status === "waiting");
  const activeServing = tokens.filter((token) => token.queueId === queue.id && token.status === "serving").length;

  const baseQueueDelay = ((waitingTokens.length + 1) / Math.max(1, queue.counters)) * queue.avgServiceMinutes;
  const demandMultiplier = getDemandMultiplier(dayName, hour);

  const logs = getQueueLogs(trafficLogs, queue.id);
  const historicalAtHour = logs.filter((log) => log.dayName === dayName && log.hour === hour).map((log) => log.avgWaitMinutes);
  const baselineHistorical = logs.map((log) => log.avgWaitMinutes);

  const historicalMultiplier =
    baselineHistorical.length > 4
      ? clamp(0.82, (average(historicalAtHour) || average(baselineHistorical)) / Math.max(1, average(baselineHistorical)), 1.55)
      : 1;

  const livePressure = 1 + activeServing * 0.05;
  const priorityBoost = priority === 2 ? 0.76 : priority === 1 ? 0.88 : 1;

  const predicted = clamp(3, Math.round(baseQueueDelay * demandMultiplier * historicalMultiplier * livePressure * priorityBoost), 240);

  const confidenceFromHistory = clamp(0, logs.length / 300, 1);
  const confidence = Math.round(62 + confidenceFromHistory * 28 + (priority > 0 ? 2 : 0));

  return {
    estimatedWaitMinutes: predicted,
    confidence,
    demandMultiplier,
    factors: {
      dayName,
      hour,
      waitingCount: waitingTokens.length,
      activeServing,
      counters: queue.counters,
      avgServiceMinutes: queue.avgServiceMinutes,
      historicalSampleSize: logs.length,
      historicalMultiplier: round(historicalMultiplier, 3),
      priority
    }
  };
}

export function generateTokenNumber(queueName, issuedCount) {
  const prefix = queueName
    .split(" ")
    .map((piece) => piece[0])
    .join("")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "Q");

  return `${prefix}-${String(issuedCount + 1).padStart(4, "0")}`;
}

export function getQueueInsights(queueId, trafficLogs) {
  const logs = getQueueLogs(trafficLogs, queueId);
  const byHour = new Map();
  const byDay = new Map();

  for (const log of logs) {
    if (!byHour.has(log.hour)) byHour.set(log.hour, []);
    byHour.get(log.hour).push(log.tokensIssued);

    if (!byDay.has(log.dayName)) byDay.set(log.dayName, []);
    byDay.get(log.dayName).push(log.tokensIssued);
  }

  const hourlyAverages = [...byHour.entries()].map(([hour, values]) => ({
    hour,
    avgTokens: round(average(values), 1)
  }));

  const dayAverages = [...byDay.entries()].map(([dayName, values]) => ({
    dayName,
    avgTokens: round(average(values), 1)
  }));

  const peakWindows = [...hourlyAverages]
    .sort((a, b) => b.avgTokens - a.avgTokens)
    .slice(0, 3)
    .map((item) => ({
      hour: item.hour,
      label: `${item.hour}:00 - ${item.hour + 1}:00`,
      avgTokens: item.avgTokens
    }));

  const bestVisitTimes = [...hourlyAverages]
    .sort((a, b) => a.avgTokens - b.avgTokens)
    .slice(0, 3)
    .map((item) => `${item.hour}:00`);

  const topDay = [...dayAverages].sort((a, b) => b.avgTokens - a.avgTokens)[0] ?? { dayName: "Monday", avgTokens: 0 };

  return {
    logsCount: logs.length,
    peakWindows,
    bestVisitTimes,
    topDay,
    hourlyAverages: hourlyAverages.sort((a, b) => a.hour - b.hour),
    dayAverages: dayAverages.sort((a, b) => DAY_ORDER.indexOf(a.dayName) - DAY_ORDER.indexOf(b.dayName))
  };
}

export function buildRecommendationCopy({ queue, queueInsights, waitForecastNow }) {
  const peakWindow = queueInsights.peakWindows[0];
  const secondaryPeakWindow = queueInsights.peakWindows[1];

  const peakSentence = peakWindow
    ? `Aaj ${peakWindow.label} peak traffic hoga (${peakWindow.avgTokens} avg tokens/hour).`
    : "Aaj medium traffic expected hai.";

  const mondaySentence =
    queueInsights.topDay.dayName === "Monday"
      ? "Monday highest load day hai."
      : `${queueInsights.topDay.dayName} highest load day hai.`;

  const suggestion = queueInsights.bestVisitTimes.length
    ? `Best time to visit: ${queueInsights.bestVisitTimes.join(", ")} (lower queue pressure).`
    : "Best slot recommendation ke liye aur data collect ho raha hai.";

  return {
    queueId: queue.id,
    queueName: queue.name,
    predictedNowMinutes: waitForecastNow.estimatedWaitMinutes,
    confidence: waitForecastNow.confidence,
    keyAlerts: [
      peakSentence,
      mondaySentence,
      suggestion,
      secondaryPeakWindow ? `Secondary rush slot: ${secondaryPeakWindow.label}.` : ""
    ].filter(Boolean)
  };
}

export function buildAdminAnalytics({ queues, tokens, trafficLogs }) {
  const waiting = tokens.filter((token) => token.status === "waiting").length;
  const serving = tokens.filter((token) => token.status === "serving").length;
  const completedToday = tokens.filter((token) => {
    if (!token.completedAt) return false;
    return new Date(token.completedAt).toDateString() === new Date().toDateString();
  }).length;

  const queueSnapshots = queues.map((queue) => {
    const queueTokens = tokens.filter((token) => token.queueId === queue.id);
    const queueWaiting = queueTokens.filter((token) => token.status === "waiting").length;
    const queueServing = queueTokens.filter((token) => token.status === "serving").length;
    const queueCompleted = queueTokens.filter((token) => token.status === "completed").length;

    const waitValues = getQueueLogs(trafficLogs, queue.id, 21).map((log) => log.avgWaitMinutes);

    return {
      queueId: queue.id,
      queueName: queue.name,
      category: queue.category,
      counters: queue.counters,
      waiting: queueWaiting,
      serving: queueServing,
      completed: queueCompleted,
      avgRecentWait: round(average(waitValues), 1)
    };
  });

  const dayLoad = DAY_ORDER.map((dayName) => {
    const entries = trafficLogs.filter((log) => log.dayName === dayName).map((log) => log.tokensIssued);
    return { dayName, avgTokens: round(average(entries), 1) };
  });

  const hourlyLoad = Array.from({ length: 12 }, (_, index) => index + 8).map((hour) => {
    const entries = trafficLogs.filter((log) => log.hour === hour).map((log) => log.tokensIssued);
    return { hour, avgTokens: round(average(entries), 1) };
  });

  return {
    summary: {
      totalQueues: queues.length,
      waiting,
      serving,
      completedToday,
      activeUsersToday: new Set(tokens.map((token) => token.phone || token.customerName)).size
    },
    queueSnapshots,
    dayLoad,
    hourlyLoad
  };
}

export function createSyntheticHistoryForQueue(queue, daysBack = 70) {
  const records = [];

  for (let dayOffset = 0; dayOffset < daysBack; dayOffset += 1) {
    for (let hour = 8; hour <= 19; hour += 1) {
      const stamp = new Date();
      stamp.setHours(hour, 0, 0, 0);
      stamp.setDate(stamp.getDate() - dayOffset);

      const dayName = getDayName(stamp);
      const multiplier = getDemandMultiplier(dayName, hour);
      const randomness = 0.88 + Math.random() * 0.3;

      const tokensIssued = Math.max(6, Math.round(queue.baseTraffic * multiplier * randomness));
      const avgWaitMinutes = Math.max(4, Math.round((tokensIssued / Math.max(1, queue.counters)) * (queue.avgServiceMinutes * 0.65)));

      records.push({
        id: `${queue.id}-${stamp.getTime()}`,
        queueId: queue.id,
        timestamp: stamp.toISOString(),
        dayName,
        hour,
        tokensIssued,
        avgWaitMinutes
      });
    }
  }

  return records;
}

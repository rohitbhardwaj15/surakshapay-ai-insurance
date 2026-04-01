import crypto from "crypto";
import cors from "cors";
import express from "express";
import {
  buildAdminAnalytics,
  buildRecommendationCopy,
  createSyntheticHistoryForQueue,
  generateTokenNumber,
  getQueueInsights,
  predictWaitTime
} from "./engine.js";
import { readDB, updateDB } from "./store.js";

const app = express();

app.use(cors());
app.use(express.json());

function nowIso() {
  return new Date().toISOString();
}

function bootstrap() {
  updateDB((db) => {
    if (db.queues.length > 0 && db.trafficLogs.length > 0) return;

    if (db.queues.length === 0) {
      db.queues = [
        {
          id: "queue_hosp_opd",
          name: "City Hospital OPD",
          category: "Healthcare",
          location: "Noida",
          counters: 6,
          avgServiceMinutes: 14,
          baseTraffic: 24,
          isActive: true,
          createdAt: nowIso()
        },
        {
          id: "queue_bank",
          name: "Metro Bank Services",
          category: "Banking",
          location: "Delhi",
          counters: 5,
          avgServiceMinutes: 9,
          baseTraffic: 28,
          isActive: true,
          createdAt: nowIso()
        },
        {
          id: "queue_govt",
          name: "Gov Citizen Center",
          category: "Government",
          location: "Ghaziabad",
          counters: 4,
          avgServiceMinutes: 18,
          baseTraffic: 21,
          isActive: true,
          createdAt: nowIso()
        },
        {
          id: "queue_diag",
          name: "Diagnostics Lab",
          category: "Healthcare",
          location: "Noida",
          counters: 3,
          avgServiceMinutes: 11,
          baseTraffic: 16,
          isActive: true,
          createdAt: nowIso()
        }
      ];
    }

    if (db.tokens.length === 0) {
      const seedTime = Date.now();
      db.tokens = [
        {
          id: crypto.randomUUID(),
          tokenNumber: "CHO-0001",
          queueId: "queue_hosp_opd",
          customerName: "Rahul Verma",
          phone: "9876543210",
          priority: 0,
          serviceType: "General OPD",
          status: "waiting",
          predictedWaitMinutes: 18,
          issuedAt: new Date(seedTime - 15 * 60000).toISOString()
        },
        {
          id: crypto.randomUUID(),
          tokenNumber: "CHO-0002",
          queueId: "queue_hosp_opd",
          customerName: "Seema Jain",
          phone: "9876543209",
          priority: 1,
          serviceType: "Senior Citizen",
          status: "serving",
          predictedWaitMinutes: 0,
          issuedAt: new Date(seedTime - 26 * 60000).toISOString(),
          servedAt: new Date(seedTime - 3 * 60000).toISOString(),
          counterNo: 2
        },
        {
          id: crypto.randomUUID(),
          tokenNumber: "MBS-0001",
          queueId: "queue_bank",
          customerName: "Ankit Kapoor",
          phone: "9898989898",
          priority: 0,
          serviceType: "Cash Deposit",
          status: "waiting",
          predictedWaitMinutes: 11,
          issuedAt: new Date(seedTime - 9 * 60000).toISOString()
        }
      ];
    }

    if (db.trafficLogs.length === 0) {
      db.trafficLogs = db.queues.flatMap((queue) => createSyntheticHistoryForQueue(queue));
    }
  });
}

bootstrap();

app.get("/", (_req, res) => {
  res.json({
    service: "SmartQueue AI API",
    status: "ok",
    version: "1.0.0",
    docs: {
      health: "/health",
      queues: "/api/queues",
      issueToken: "/api/tokens/issue",
      adminAnalytics: "/api/admin/analytics"
    },
    time: nowIso()
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "SmartQueue", time: nowIso() });
});

app.get("/api/queues", (_req, res) => {
  const db = readDB();

  const queues = db.queues.map((queue) => {
    const tokens = db.tokens.filter((token) => token.queueId === queue.id);
    const waiting = tokens.filter((token) => token.status === "waiting").length;
    const serving = tokens.filter((token) => token.status === "serving").length;
    const prediction = predictWaitTime({ queue, tokens: db.tokens, trafficLogs: db.trafficLogs });

    return {
      ...queue,
      live: {
        waiting,
        serving,
        totalActive: waiting + serving,
        predictedWaitMinutes: prediction.estimatedWaitMinutes,
        confidence: prediction.confidence
      }
    };
  });

  res.json(queues);
});

app.get("/api/queues/:queueId", (req, res) => {
  const { queueId } = req.params;
  const db = readDB();
  const queue = db.queues.find((item) => item.id === queueId);

  if (!queue) return res.status(404).json({ error: "Queue not found." });

  const tokens = db.tokens
    .filter((token) => token.queueId === queue.id)
    .sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());

  const prediction = predictWaitTime({ queue, tokens: db.tokens, trafficLogs: db.trafficLogs });
  const insights = getQueueInsights(queue.id, db.trafficLogs);

  res.json({ queue, prediction, insights, tokens });
});

app.post("/api/queues", (req, res) => {
  const { name, category, location, counters, avgServiceMinutes, baseTraffic } = req.body;

  if (!name || !category || !location || !counters || !avgServiceMinutes) {
    return res.status(400).json({
      error: "name, category, location, counters and avgServiceMinutes are required."
    });
  }

  const created = updateDB((db) => {
    const queue = {
      id: crypto.randomUUID(),
      name,
      category,
      location,
      counters: Number(counters),
      avgServiceMinutes: Number(avgServiceMinutes),
      baseTraffic: Number(baseTraffic || 18),
      isActive: true,
      createdAt: nowIso()
    };

    db.queues.push(queue);
    db.trafficLogs.push(...createSyntheticHistoryForQueue(queue, 45));
    return queue;
  });

  res.status(201).json(created);
});

app.patch("/api/queues/:queueId/status", (req, res) => {
  const { queueId } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive must be boolean." });
  }

  const updated = updateDB((db) => {
    const queue = db.queues.find((item) => item.id === queueId);
    if (!queue) return null;

    queue.isActive = isActive;
    queue.updatedAt = nowIso();
    return queue;
  });

  if (!updated) return res.status(404).json({ error: "Queue not found." });

  res.json(updated);
});

app.post("/api/tokens/issue", (req, res) => {
  const { queueId, customerName, phone, serviceType, priority = 0 } = req.body;

  if (!queueId || !customerName) {
    return res.status(400).json({ error: "queueId and customerName are required." });
  }

  const created = updateDB((db) => {
    const queue = db.queues.find((item) => item.id === queueId);
    if (!queue) return { error: "Queue not found." };
    if (!queue.isActive) return { error: "Queue is inactive." };

    const queueTokens = db.tokens.filter((token) => token.queueId === queueId);
    const prediction = predictWaitTime({ queue, tokens: db.tokens, trafficLogs: db.trafficLogs, priority: Number(priority) });

    const token = {
      id: crypto.randomUUID(),
      tokenNumber: generateTokenNumber(queue.name, queueTokens.length),
      queueId,
      customerName,
      phone: phone || "",
      serviceType: serviceType || "General",
      priority: Number(priority),
      status: "waiting",
      predictedWaitMinutes: prediction.estimatedWaitMinutes,
      predictionConfidence: prediction.confidence,
      issuedAt: nowIso()
    };

    db.tokens.push(token);

    return {
      token,
      prediction
    };
  });

  if (created.error) return res.status(404).json({ error: created.error });

  res.status(201).json(created);
});

app.post("/api/queues/:queueId/serve-next", (req, res) => {
  const { queueId } = req.params;
  const { counterNo = 1 } = req.body;

  const served = updateDB((db) => {
    const queue = db.queues.find((item) => item.id === queueId);
    if (!queue) return { error: "Queue not found." };

    const nextWaiting = db.tokens
      .filter((token) => token.queueId === queueId && token.status === "waiting")
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
      })[0];

    if (!nextWaiting) return { error: "No waiting token in this queue." };

    nextWaiting.status = "serving";
    nextWaiting.servedAt = nowIso();
    nextWaiting.counterNo = Number(counterNo);
    nextWaiting.predictedWaitMinutes = 0;

    return nextWaiting;
  });

  if (served.error) return res.status(404).json({ error: served.error });

  res.json(served);
});

app.post("/api/tokens/:tokenId/complete", (req, res) => {
  const { tokenId } = req.params;

  const completed = updateDB((db) => {
    const token = db.tokens.find((item) => item.id === tokenId);
    if (!token) return null;

    token.status = "completed";
    token.completedAt = nowIso();
    return token;
  });

  if (!completed) return res.status(404).json({ error: "Token not found." });

  res.json(completed);
});

app.get("/api/tokens", (req, res) => {
  const { queueId, status } = req.query;
  const db = readDB();

  const list = db.tokens
    .filter((token) => (queueId ? token.queueId === queueId : true))
    .filter((token) => (status ? token.status === status : true))
    .sort((a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime());

  res.json(list);
});

app.get("/api/predictions/:queueId", (req, res) => {
  const { queueId } = req.params;
  const db = readDB();
  const queue = db.queues.find((item) => item.id === queueId);

  if (!queue) return res.status(404).json({ error: "Queue not found." });

  const prediction = predictWaitTime({ queue, tokens: db.tokens, trafficLogs: db.trafficLogs });
  const insights = getQueueInsights(queue.id, db.trafficLogs);

  res.json({ queueId, queueName: queue.name, prediction, insights });
});

app.get("/api/recommendations/:queueId", (req, res) => {
  const { queueId } = req.params;
  const db = readDB();
  const queue = db.queues.find((item) => item.id === queueId);

  if (!queue) return res.status(404).json({ error: "Queue not found." });

  const waitForecastNow = predictWaitTime({ queue, tokens: db.tokens, trafficLogs: db.trafficLogs });
  const queueInsights = getQueueInsights(queue.id, db.trafficLogs);

  const response = buildRecommendationCopy({ queue, queueInsights, waitForecastNow });
  res.json(response);
});

app.get("/api/admin/analytics", (_req, res) => {
  const db = readDB();
  const analytics = buildAdminAnalytics({
    queues: db.queues,
    tokens: db.tokens,
    trafficLogs: db.trafficLogs
  });

  res.json(analytics);
});

app.post("/api/simulate/traffic", (req, res) => {
  const { queueId, tokensIssued, avgWaitMinutes, hour } = req.body;

  if (!queueId || !tokensIssued || !avgWaitMinutes) {
    return res.status(400).json({ error: "queueId, tokensIssued and avgWaitMinutes are required." });
  }

  const created = updateDB((db) => {
    const queue = db.queues.find((item) => item.id === queueId);
    if (!queue) return null;

    const now = new Date();
    if (typeof hour === "number") now.setHours(hour, 0, 0, 0);

    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

    const log = {
      id: crypto.randomUUID(),
      queueId,
      timestamp: now.toISOString(),
      dayName,
      hour: now.getHours(),
      tokensIssued: Number(tokensIssued),
      avgWaitMinutes: Number(avgWaitMinutes)
    };

    db.trafficLogs.push(log);
    return log;
  });

  if (!created) return res.status(404).json({ error: "Queue not found." });

  res.status(201).json(created);
});

export default app;

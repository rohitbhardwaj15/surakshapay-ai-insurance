import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";

const TRIGGERS = [
  { type: "rain", label: "Simulate Rain (>35mm)" },
  { type: "aqi", label: "Simulate AQI (>350)" },
  { type: "heatwave", label: "Simulate Heatwave (>44C)" },
  { type: "curfew", label: "Simulate Curfew" },
  { type: "flood", label: "Simulate Flood" }
];

export default function TriggerPage() {
  const { city } = useUser();
  const [latest, setLatest] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const alertText = useMemo(() => {
    if (!latest) return "No active trigger in your city.";
    return `ALERT: ${latest.type.toUpperCase()} trigger in ${latest.city} at ${new Date(latest.triggeredAt).toLocaleString()}`;
  }, [latest]);

  async function loadLatest() {
    if (!city) return;
    const data = await api.latestTrigger(city);
    setLatest(data);
  }

  useEffect(() => {
    loadLatest().catch((e) => setError(e.message));
    const id = setInterval(() => {
      loadLatest().catch(() => null);
    }, 5000);
    return () => clearInterval(id);
  }, [city]);

  async function simulate(type) {
    setBusy(type);
    setError("");
    try {
      const data = await api.simulateTrigger({ type, city, timeAlignedWithShift: true });
      setResult(data);
      await loadLatest();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="panel">
      <h2>Trigger Simulation Panel</h2>
      <p className="alert-banner">{alertText}</p>

      <div className="trigger-grid">
        {TRIGGERS.map((t) => (
          <button key={t.type} onClick={() => simulate(t.type)} className="btn btn-ghost" disabled={busy === t.type}>
            {busy === t.type ? "Running..." : t.label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <article className="result">
          <h3>Automation Output</h3>
          <p>Trigger validated. Claims processed: {result.claimCount}</p>
          <p>Flow: Trigger to Validate to Claim to Payout</p>
        </article>
      )}
    </section>
  );
}

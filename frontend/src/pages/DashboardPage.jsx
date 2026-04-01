import { useEffect, useState } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";

function Stat({ title, value }) {
  return (
    <article className="stat">
      <p>{title}</p>
      <h3>{value}</h3>
    </article>
  );
}

export default function DashboardPage() {
  const { userId } = useUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const next = await api.dashboard(userId);
        if (!mounted) return;
        setData(next);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e.message);
      }
    }
    run();
    const interval = setInterval(run, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  if (error) return <section className="panel error">{error}</section>;
  if (!data) return <section className="panel">Loading dashboard...</section>;

  const { user, policy, latestClaim } = data;

  return (
    <section className="panel">
      <h2>Dashboard</h2>
      <p className="muted">Live policy intelligence with AI-based risk monitoring.</p>
      <div className="stats-grid">
        <Stat title="Partner" value={user.name} />
        <Stat title="City / Platform" value={`${user.city} · ${user.platform}`} />
        <Stat title="Weekly Income" value={`Rs ${user.weeklyIncome}`} />
        <Stat title="AI Risk Score" value={policy.riskScore} />
        <Stat title="Weekly Premium" value={`Rs ${policy.premium.weeklyPremium}`} />
        <Stat title="Coverage Amount" value={`Rs ${policy.coverageAmount}`} />
        <Stat title="Policy Status" value={policy.status} />
        <Stat title="Last Claim" value={latestClaim ? `${latestClaim.status} · Rs ${latestClaim.payoutAmount}` : "No claims yet"} />
      </div>
    </section>
  );
}

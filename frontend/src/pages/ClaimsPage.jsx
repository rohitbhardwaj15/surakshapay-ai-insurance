import { useEffect, useState } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";

export default function ClaimsPage() {
  const { userId } = useUser();
  const [claims, setClaims] = useState([]);
  const [fraud, setFraud] = useState({ status: "Fraud Check Passed", latestFraudScore: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [claimData, fraudData] = await Promise.all([api.claims(userId), api.fraud(userId)]);
        if (!mounted) return;
        setClaims(claimData);
        setFraud(fraudData);
      } catch (e) {
        if (!mounted) return;
        setError(e.message);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  return (
    <section className="panel">
      <h2>Claims & Fraud Status</h2>
      {error && <p className="error">{error}</p>}

      <div className={`fraud-box ${fraud.status === "Under Review" ? "warn" : "ok"}`}>
        <p>Fraud Status Indicator</p>
        <h3>{fraud.status}</h3>
        <p>Fraud score: {fraud.latestFraudScore}</p>
      </div>

      {!claims.length && <p className="muted">No claims yet. Simulate a trigger after activating policy.</p>}
      <div className="claims-list">
        {claims.map((claim) => (
          <article className="claim-card" key={claim.id}>
            <h3>{claim.triggerType.toUpperCase()} Trigger</h3>
            <p>Claim status: {claim.status}</p>
            <p>Payout amount: Rs {claim.payoutAmount}</p>
            <p>Timestamp: {new Date(claim.createdAt).toLocaleString()}</p>
            <p>Message: {claim.reason === "Auto-processed" ? "Auto-processed" : claim.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

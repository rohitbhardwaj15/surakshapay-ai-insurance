import { useEffect, useState } from "react";
import { api } from "../api";
import { useUser } from "../context/UserContext";

export default function PolicyPage() {
  const { userId } = useUser();
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadPolicy() {
    try {
      const p = await api.policyByUser(userId);
      setPolicy(p);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadPolicy();
  }, [userId]);

  async function togglePolicy() {
    if (!policy) return;
    setLoading(true);
    try {
      const next = await api.updatePolicyStatus(policy.id, policy.status === "Active" ? "Inactive" : "Active");
      setPolicy(next);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (error) return <section className="panel error">{error}</section>;
  if (!policy) return <section className="panel">Loading policy...</section>;

  return (
    <section className="panel">
      <h2>Policy Details</h2>
      <div className="split">
        <article>
          <h3>Premium Breakdown</h3>
          <ul className="plain-list">
            <li>Base rate: Rs {policy.premium.baseRate}</li>
            <li>Risk multiplier: x {policy.premium.riskMultiplier}</li>
            <li>Weekly premium: Rs {policy.premium.weeklyPremium}</li>
          </ul>
          <h3>Coverage</h3>
          <p>Coverage cap = 70% of weekly income.</p>
          <p>Current cap: Rs {policy.coverageAmount}</p>
        </article>
        <article>
          <h3>Compliance & Logic</h3>
          <ul className="plain-list">
            <li>{policy.complianceNotes.moralHazard}</li>
            <li>{policy.complianceNotes.basisRisk}</li>
            <li>{policy.complianceNotes.failSafe}</li>
          </ul>
          <h3>Exclusions</h3>
          <ul className="plain-list">
            {policy.exclusions.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <button className="btn btn-primary" onClick={togglePolicy} disabled={loading}>
            {loading ? "Updating..." : policy.status === "Active" ? "Deactivate Policy" : "Activate Policy"}
          </button>
        </article>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api";

export default function AdminPage() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .adminOverview()
      .then(setOverview)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <section className="panel error">{error}</section>;
  if (!overview) return <section className="panel">Loading admin view...</section>;

  return (
    <section className="panel">
      <h2>Admin Panel (Bonus)</h2>
      <div className="stats-grid">
        <article className="stat">
          <p>Total Users</p>
          <h3>{overview.totals.users}</h3>
        </article>
        <article className="stat">
          <p>Active Policies</p>
          <h3>{overview.totals.activePolicies}</h3>
        </article>
        <article className="stat">
          <p>Total Claims</p>
          <h3>{overview.totals.claims}</h3>
        </article>
        <article className="stat">
          <p>Fraud Alerts</p>
          <h3>{overview.totals.underReview}</h3>
        </article>
        <article className="stat">
          <p>Total Payout</p>
          <h3>Rs {overview.totals.totalPayout}</h3>
        </article>
      </div>
    </section>
  );
}

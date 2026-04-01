import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">AI-Powered Parametric Micro-Insurance</p>
      <h1>Protect gig-worker weekly income from weather, pollution, and city disruptions.</h1>
      <p className="hero-text">
        SurakshaPay provides automated, hyperlocal protection for Q-Commerce delivery partners at Zepto and Blinkit.
        AI computes fair premiums, sensors detect trigger events, and claims are auto-processed in real time.
      </p>
      <div className="hero-actions">
        <Link className="btn btn-primary" to="/register">
          Get Protected
        </Link>
        <Link className="btn btn-ghost" to="/dashboard">
          View Dashboard
        </Link>
      </div>

      <div className="compliance-card">
        <h3>Coverage Scope & Exclusions</h3>
        <p>
          Covered: localized environmental disruptions, weather-based work interruptions, and zone-specific shutdowns.
        </p>
        <p>
          Excluded: war/armed conflict/riots, pandemics, nationwide lockdowns, platform-wide outages, and large-scale
          disasters (earthquakes/cyclones). These exclusions maintain risk-pool stability and prevent catastrophic
          mass payouts.
        </p>
      </div>
    </section>
  );
}

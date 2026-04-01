import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useUser } from "../context/UserContext";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    city: "Mumbai",
    platform: "Zepto",
    weeklyIncome: 6500
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { saveUser } = useUser();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api.registerUser({
        ...form,
        weeklyIncome: Number(form.weeklyIncome)
      });
      await api.createPolicy(user.id);
      saveUser(user.id, user.city);
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>Partner Registration</h2>
      <p className="muted">Create your profile and start AI-calculated income protection.</p>
      <form className="grid-form" onSubmit={submit}>
        <label>
          Name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Delivery Partner Name"
          />
        </label>
        <label>
          City
          <select value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}>
            <option>Mumbai</option>
            <option>Delhi</option>
            <option>Bengaluru</option>
            <option>Kolkata</option>
            <option>Hyderabad</option>
          </select>
        </label>
        <label>
          Platform
          <select value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}>
            <option>Zepto</option>
            <option>Blinkit</option>
          </select>
        </label>
        <label>
          Weekly Income (INR)
          <input
            type="number"
            min="1000"
            required
            value={form.weeklyIncome}
            onChange={(e) => setForm((p) => ({ ...p, weeklyIncome: e.target.value }))}
          />
        </label>
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creating..." : "Submit"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

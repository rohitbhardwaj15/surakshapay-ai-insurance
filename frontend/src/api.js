const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  registerUser: (payload) =>
    request("/api/users/register", { method: "POST", body: JSON.stringify(payload) }),
  createPolicy: (userId) => request(`/api/policies/create/${userId}`, { method: "POST" }),
  updatePolicyStatus: (policyId, status) =>
    request(`/api/policies/${policyId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  dashboard: (userId) => request(`/api/dashboard/${userId}`),
  policyByUser: (userId) => request(`/api/policies/user/${userId}`),
  simulateTrigger: (payload) =>
    request("/api/triggers/simulate", { method: "POST", body: JSON.stringify(payload) }),
  latestTrigger: (city) => request(`/api/triggers/latest/${city}`),
  claims: (userId) => request(`/api/claims/${userId}`),
  fraud: (userId) => request(`/api/fraud/${userId}`),
  pingActivity: (userId, deviceId) =>
    request(`/api/activity/${userId}`, { method: "POST", body: JSON.stringify({ deviceId }) }),
  adminOverview: () => request("/api/admin/overview")
};

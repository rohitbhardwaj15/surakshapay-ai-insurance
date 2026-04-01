import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PolicyPage from "./pages/PolicyPage";
import TriggerPage from "./pages/TriggerPage";
import ClaimsPage from "./pages/ClaimsPage";
import AdminPage from "./pages/AdminPage";
import { useUser } from "./context/UserContext";

function Nav() {
  const location = useLocation();
  const { userId } = useUser();
  const links = [
    ["/", "Home"],
    ["/register", "Register"],
    ["/dashboard", "Dashboard"],
    ["/policy", "Policy"],
    ["/triggers", "Trigger Panel"],
    ["/claims", "Claims"],
    ["/admin", "Admin"]
  ];

  return (
    <header className="nav-shell">
      <div className="brand">
        <div className="brand-dot" />
        <span>SurakshaPay</span>
      </div>
      <nav>
        {links.map(([path, label]) => (
          <Link
            key={path}
            to={path}
            className={`nav-link ${location.pathname === path ? "active" : ""} ${!userId && path !== "/" && path !== "/register" ? "disabled" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function ProtectedRoute({ children }) {
  const { userId } = useUser();
  if (!userId) return <Navigate to="/register" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="main-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/policy"
            element={
              <ProtectedRoute>
                <PolicyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/triggers"
            element={
              <ProtectedRoute>
                <TriggerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims"
            element={
              <ProtectedRoute>
                <ClaimsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

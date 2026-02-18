import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function Sidebar({ pendingCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(UserContext);

  const getCurrentPath = () => {
    const path = location.pathname.toLowerCase();
    if (path === "/dashboard" || path === "/") return "dashboard";
    if (path === "/employees") return "employees";
    if (path === "/attendance") return "attendance";
    if (path === "/leave") return "leave";
    if (path === "/reports" || path === "/hr-dashboard") return "reports";
    if (path === "/settings") return "settings";
    if (path === "/escalation") return "escalation";
    if (path === "/my-escalations") return "my-escalations";
    return "dashboard";
  };

  const activeNav = getCurrentPath();
  const isHR = user?.role === "HR" || user?.role === "MD";
  const canAccessEscalation = user?.role === "TL" || user?.role === "HR" || user?.role === "MD" || user?.role === "MANAGER";

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", path: "/dashboard" },
    { id: "employees", label: "Employees", icon: "👥", path: "/employees" },
    { id: "attendance", label: "Attendance", icon: "✓", path: "/attendance" },
    { id: "leave", label: "Leave", icon: "📅", path: "/leave" },
    ...(isHR ? [{ id: "reports", label: "Reports", icon: "📈", path: "/reports" }] : []),
    ...(canAccessEscalation ? [{ id: "escalation", label: "Escalation", icon: "⚠️", path: "/escalation" }] : []),
    ...(user?.role === "EMPLOYEE" ? [{ id: "my-escalations", label: "My Escalations", icon: "📋", path: "/my-escalations" }] : []),
    { id: "settings", label: "Settings", icon: "⚙", path: "/settings" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        width: 220,
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
      }}
    >
      {/* Logo Section */}
      <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #1e293b" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            color: "white",
          }}
        >
          💼
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>PeopleCore</div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              width: "100%",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: activeNav === item.id ? "rgba(37, 99, 235, 0.15)" : "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeNav === item.id ? 600 : 400,
              color: activeNav === item.id ? "#2563eb" : "#94a3b8",
              transition: "all 0.2s ease",
              borderLeft: activeNav === item.id ? "3px solid #2563eb" : "3px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (activeNav !== item.id) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                e.currentTarget.style.color = "#cbd5e1";
              }
            }}
            onMouseLeave={(e) => {
              if (activeNav !== item.id) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#94a3b8";
              }
            }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
            {item.id === "reports" && pendingCount > 0 && (
              <div
                style={{
                  background: "#ef4444",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {pendingCount}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div style={{ borderTop: "1px solid #1e293b", padding: "16px 20px" }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Logged in as</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 2 }}>{user?.email}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>
            {user?.role === "MD" && "Managing Director"}
            {user?.role === "HR" && "HR Manager"}
            {user?.role === "MANAGER" && "Manager"}
            {user?.role === "EMPLOYEE" && "Employee"}
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

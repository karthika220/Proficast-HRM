import { useState, useEffect } from "react";

const sidebarNav = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "employees", icon: "👥", label: "Employees" },
  { id: "attendance", icon: "🕐", label: "Attendance" },
  { id: "leave", icon: "📅", label: "Leave" },
  { id: "reports", icon: "📊", label: "Reports" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

const employees = [
  { id: 1, name: "Arjun Mehta", role: "Managing Director", dept: "Executive", tier: 1, status: "Present", avatar: "AM", leaveBalance: { cl: 8, sl: 8 }, checkIn: "09:02", checkOut: null },
  { id: 2, name: "Priya Sharma", role: "HR Manager", dept: "Human Resources", tier: 2, status: "Present", avatar: "PS", leaveBalance: { cl: 5, sl: 7 }, checkIn: "08:58", checkOut: null },
  { id: 3, name: "Rohan Verma", role: "Creative Manager", dept: "Creative", tier: 3, status: "Late", avatar: "RV", leaveBalance: { cl: 6, sl: 8 }, checkIn: "09:47", checkOut: null },
  { id: 4, name: "Sneha Kapoor", role: "Senior Designer", dept: "Creative", tier: 4, status: "Present", avatar: "SK", leaveBalance: { cl: 3, sl: 4 }, checkIn: "09:01", checkOut: null },
  { id: 5, name: "Karan Joshi", role: "Content Strategist", dept: "Content", tier: 4, status: "On Leave", avatar: "KJ", leaveBalance: { cl: 1, sl: 8 }, checkIn: null, checkOut: null },
  { id: 6, name: "Ananya Roy", role: "Account Manager", dept: "Client Services", tier: 3, status: "Present", avatar: "AR", leaveBalance: { cl: 7, sl: 6 }, checkIn: "09:05", checkOut: null },
  { id: 7, name: "Vikram Singh", role: "Digital Marketer", dept: "Performance", tier: 4, status: "Absent", avatar: "VS", leaveBalance: { cl: 8, sl: 5 }, checkIn: null, checkOut: null },
  { id: 8, name: "Meera Nair", role: "Copywriter", dept: "Content", tier: 4, status: "Present", avatar: "MN", leaveBalance: { cl: 6, sl: 8 }, checkIn: "08:55", checkOut: null },
];

const leaveRequests = [
  { id: 1, employee: "Karan Joshi", avatar: "KJ", type: "CL", from: "Feb 13", to: "Feb 14", days: 2, reason: "Personal work", status: "Approved", manager: "Ananya Roy" },
  { id: 2, employee: "Sneha Kapoor", avatar: "SK", type: "SL", from: "Feb 18", to: "Feb 18", days: 1, reason: "Medical appointment", status: "Pending", manager: "Rohan Verma" },
  { id: 3, employee: "Vikram Singh", avatar: "VS", type: "CL", from: "Feb 20", to: "Feb 22", days: 3, reason: "Family function", status: "Pending", manager: "Ananya Roy" },
  { id: 4, employee: "Meera Nair", avatar: "MN", type: "SL", from: "Feb 10", to: "Feb 11", days: 2, reason: "Fever", status: "Approved", manager: "Rohan Verma" },
];

const attendanceLogs = [
  { date: "13 Feb", day: "Thu", checkIn: "09:02", checkOut: "18:45", status: "Present", hours: "9h 43m" },
  { date: "12 Feb", day: "Wed", checkIn: "09:15", checkOut: "19:00", status: "Late", hours: "9h 45m" },
  { date: "11 Feb", day: "Tue", checkIn: "08:58", checkOut: "18:47", status: "Present", hours: "9h 49m" },
  { date: "10 Feb", day: "Mon", checkIn: null, checkOut: null, status: "On Leave", hours: "-" },
  { date: "08 Feb", day: "Sat", checkIn: "09:00", checkOut: "18:45", status: "Present", hours: "9h 45m" },
  { date: "07 Feb", day: "Fri", checkIn: "09:22", checkOut: "18:50", status: "Late", hours: "9h 28m" },
];

export default function PeopleCoreApp() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [leaveTab, setLeaveTab] = useState("requests");
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCheckIn = () => {
    if (!checkedIn) {
      setCheckedIn(true);
      setCheckInTime(new Date());
      showNotification("Check-in recorded at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } else {
      setCheckedIn(false);
      showNotification("Check-out recorded. Have a great evening!", "info");
    }
  };

  const presentCount = employees.filter((e) => e.status === "Present").length;
  const lateCount = employees.filter((e) => e.status === "Late").length;
  const absentCount = employees.filter((e) => e.status === "Absent").length;
  const onLeaveCount = employees.filter((e) => e.status === "On Leave").length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending").length;

  const statusColor = (s) => {
    if (s === "Present") return "#16a34a";
    if (s === "Late") return "#d97706";
    if (s === "On Leave") return "#2563eb";
    if (s === "Absent") return "#dc2626";
    return "#6b7280";
  };

  const tierLabel = (t) => ["", "Managing Director", "HR", "Manager", "Employee"][t];
  const tierColor = (t) => ["", "#7c3aed", "#0891b2", "#059669", "#64748b"][t];

  const leaveTypeColor = (t) => (t === "CL" ? "#0891b2" : t === "SL" ? "#059669" : "#dc2626");

  const formatTime = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d) =>
    d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f1f5f9", overflow: "hidden" }}>
      
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: notification.type === "success" ? "#166534" : "#1e40af",
          color: "white", padding: "12px 20px", borderRadius: 10,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)", fontSize: 14, fontWeight: 500,
          animation: "slideIn 0.3s ease", display: "flex", alignItems: "center", gap: 8
        }}>
          {notification.type === "success" ? "✓" : "ℹ"} {notification.msg}
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <div style={{
        width: 220, background: "#0f172a", display: "flex", flexDirection: "column",
        flexShrink: 0, borderRight: "1px solid #1e293b"
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "white"
            }}>P</div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>PeopleCore</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>HR Platform</div>
            </div>
          </div>
        </div>

        {/* Current User */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 12, fontWeight: 700
            }}>PS</div>
            <div>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Priya Sharma</div>
              <div style={{ color: "#0891b2", fontSize: 11 }}>HR Manager</div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: "12px 12px" }}>
          {sidebarNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                marginBottom: 2,
                background: activeNav === item.id ? "rgba(59,130,246,0.15)" : "transparent",
                color: activeNav === item.id ? "#60a5fa" : "#94a3b8",
                fontSize: 13.5, fontWeight: activeNav === item.id ? 600 : 400,
                textAlign: "left", transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
              {item.id === "leave" && pendingLeaves > 0 && (
                <span style={{
                  marginLeft: "auto", background: "#dc2626", color: "white",
                  fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px"
                }}>{pendingLeaves}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b" }}>
          <div style={{ color: "#475569", fontSize: 11 }}>© 2026 PeopleCore v1.0</div>
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* TOP BAR */}
        <div style={{
          background: "white", borderBottom: "1px solid #e2e8f0",
          padding: "0 28px", height: 60, display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              {sidebarNav.find(n => n.id === activeNav)?.label}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{formatDate(currentTime)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Live Clock */}
            <div style={{
              background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
              padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#0f172a",
              fontVariantNumeric: "tabular-nums"
            }}>{formatTime(currentTime)}</div>

            {/* Check In/Out Button */}
            <button
              onClick={handleCheckIn}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                background: checkedIn ? "#fee2e2" : "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: checkedIn ? "#dc2626" : "white",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s ease"
              }}
            >
              {checkedIn ? "⏹ Check Out" : "▶ Check In"}
            </button>

            {checkedIn && checkInTime && (
              <div style={{ fontSize: 12, color: "#059669", fontWeight: 500 }}>
                ✓ Since {checkInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}

            {/* Notifications bell */}
            <div style={{ position: "relative", cursor: "pointer" }}>
              <div style={{ fontSize: 20 }}>🔔</div>
              {pendingLeaves > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#dc2626", color: "white", fontSize: 9,
                  width: 14, height: 14, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700
                }}>{pendingLeaves}</span>
              )}
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* ===== DASHBOARD ===== */}
          {activeNav === "dashboard" && (
            <div>
              {/* Stat Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { label: "Present Today", value: presentCount, icon: "✓", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
                  { label: "Late Arrivals", value: lateCount, icon: "⏱", bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
                  { label: "On Leave", value: onLeaveCount, icon: "🏖", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
                  { label: "Absent", value: absentCount, icon: "✗", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12,
                    padding: "18px 20px", display: "flex", alignItems: "center", gap: 14
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: s.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontSize: 18
                    }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Today's Attendance Feed */}
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Today's Attendance</div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Thu, 13 Feb 2026</span>
                  </div>
                  <div style={{ padding: "8px 0" }}>
                    {employees.map((emp) => (
                      <div key={emp.id} style={{
                        padding: "10px 20px", display: "flex", alignItems: "center",
                        justifyContent: "space-between", borderBottom: "1px solid #f8fafc",
                        cursor: "pointer", transition: "background 0.1s"
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        onClick={() => { setSelectedEmployee(emp); setEmployeeModalOpen(true); }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: `linear-gradient(135deg, ${tierColor(emp.tier)}aa, ${tierColor(emp.tier)})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: 11, fontWeight: 700
                          }}>{emp.avatar}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{emp.role}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {emp.checkIn && (
                            <span style={{ fontSize: 11, color: "#64748b" }}>{emp.checkIn}</span>
                          )}
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                            background: statusColor(emp.status) + "18", color: statusColor(emp.status)
                          }}>{emp.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Leave Requests */}
                <div>
                  <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 20 }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Pending Approvals</div>
                      <span style={{ background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 8px" }}>{pendingLeaves} pending</span>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      {leaveRequests.filter(l => l.status === "Pending").map((req) => (
                        <div key={req.id} style={{ padding: "12px 20px", borderBottom: "1px solid #f8fafc" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%", background: "#e2e8f0",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 700, color: "#475569"
                              }}>{req.avatar}</div>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{req.employee}</span>
                                <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{req.from} → {req.to} ({req.days}d)</span>
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                              background: leaveTypeColor(req.type) + "18", color: leaveTypeColor(req.type)
                            }}>{req.type}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => showNotification(`Leave approved for ${req.employee}`)} style={{
                              flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #bbf7d0",
                              background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 600, cursor: "pointer"
                            }}>✓ Approve</button>
                            <button onClick={() => showNotification(`Leave rejected for ${req.employee}`, "info")} style={{
                              flex: 1, padding: "6px", borderRadius: 6, border: "1px solid #fecaca",
                              background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer"
                            }}>✗ Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderRadius: 12, padding: "20px", color: "white" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 14 }}>This Month Overview</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        { label: "Total Employees", value: employees.length, unit: "staff" },
                        { label: "Attendance Rate", value: "78%", unit: "avg" },
                        { label: "Leaves Approved", value: "14", unit: "this month" },
                        { label: "Late Arrivals", value: "23", unit: "total" },
                      ].map(s => (
                        <div key={s.label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "12px 14px" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>{s.value}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== EMPLOYEES ===== */}
          {activeNav === "employees" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <input placeholder="🔍  Search employees..." style={{
                    padding: "9px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                    fontSize: 13, background: "white", width: 260, outline: "none", color: "#0f172a"
                  }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <select style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "white", color: "#0f172a", outline: "none" }}>
                    <option>All Departments</option>
                    <option>Creative</option>
                    <option>Content</option>
                    <option>Performance</option>
                    <option>Client Services</option>
                  </select>
                  <button onClick={() => showNotification("Add Employee form coming in v1.1")} style={{
                    padding: "9px 18px", background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                    color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}>+ Add Employee</button>
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Employee", "Department", "Access Tier", "Leave Balance (CL / SL)", "Status", "Today"].map(h => (
                        <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#fafbff"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        onClick={() => { setSelectedEmployee(emp); setEmployeeModalOpen(true); }}
                      >
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: `linear-gradient(135deg, ${tierColor(emp.tier)}88, ${tierColor(emp.tier)})`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "white", fontSize: 12, fontWeight: 700
                            }}>{emp.avatar}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{emp.name}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{emp.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 13, color: "#374151" }}>{emp.dept}</td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                            background: tierColor(emp.tier) + "18", color: tierColor(emp.tier)
                          }}>T{emp.tier} · {tierLabel(emp.tier)}</span>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 12, background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{emp.leaveBalance.cl} CL</span>
                            <span style={{ fontSize: 12, background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{emp.leaveBalance.sl} SL</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 20px" }}>
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
                            background: statusColor(emp.status) + "18", color: statusColor(emp.status)
                          }}>{emp.status}</span>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12, color: "#64748b" }}>
                          {emp.checkIn ? `In: ${emp.checkIn}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== ATTENDANCE ===== */}
          {activeNav === "attendance" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* My Attendance Log */}
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>My Attendance Log</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>February 2026</div>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Date", "Check In", "Check Out", "Hours", "Status"].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceLogs.map((log) => (
                        <tr key={log.date} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "11px 16px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{log.date}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{log.day}</div>
                          </td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>{log.checkIn || "—"}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>{log.checkOut || "—"}</td>
                          <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b" }}>{log.hours}</td>
                          <td style={{ padding: "11px 16px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                              background: statusColor(log.status) + "18", color: statusColor(log.status)
                            }}>{log.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Check-In Panel */}
                <div>
                  <div style={{
                    background: checkedIn ? "linear-gradient(135deg, #052e16, #14532d)" : "linear-gradient(135deg, #1e293b, #0f172a)",
                    borderRadius: 12, padding: "28px", color: "white", marginBottom: 16, textAlign: "center"
                  }}>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Current Time</div>
                    <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-1px", marginBottom: 4 }}>{formatTime(currentTime)}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>{formatDate(currentTime)}</div>

                    {checkedIn && checkInTime && (
                      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 16px", marginBottom: 20 }}>
                        <div style={{ fontSize: 12, color: "#86efac" }}>✓ Checked in since {checkInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    )}

                    <button onClick={handleCheckIn} style={{
                      padding: "14px 40px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: checkedIn ? "#dc2626" : "#2563eb",
                      color: "white", fontSize: 15, fontWeight: 700, width: "100%",
                      transition: "all 0.2s ease"
                    }}>
                      {checkedIn ? "⏹  Check Out" : "▶  Check In Now"}
                    </button>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 10 }}>
                      Shift: Mon–Sat · 9:00 AM – 6:45 PM
                    </div>
                  </div>

                  {/* Attendance Status Codes */}
                  <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>Status Codes</div>
                    {[
                      { code: "P", label: "Present", desc: "Check-in before 9:15 AM", color: "#16a34a" },
                      { code: "L", label: "Late", desc: "Check-in after 9:15 AM", color: "#d97706" },
                      { code: "A", label: "Absent", desc: "No check-in recorded", color: "#dc2626" },
                      { code: "OL", label: "On Leave", desc: "Approved leave day", color: "#2563eb" },
                      { code: "WFH", label: "Remote", desc: "Working from home", color: "#7c3aed" },
                    ].map(s => (
                      <div key={s.code} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ width: 28, height: 20, borderRadius: 4, background: s.color + "20", color: s.color, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.code}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", width: 60 }}>{s.label}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== LEAVE ===== */}
          {activeNav === "leave" && (
            <div>
              {/* Leave Balance Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { type: "Casual Leave", code: "CL", total: 8, used: 3, color: "#2563eb" },
                  { type: "Sick Leave", code: "SL", total: 8, used: 1, color: "#059669" },
                  { type: "Unpaid Leave", code: "UL", total: "∞", used: 0, color: "#dc2626" },
                ].map(l => (
                  <div key={l.type} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{l.type}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>FY 2026</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: l.color + "18", color: l.color }}>{l.code}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: l.color }}>{typeof l.total === "number" ? l.total - l.used : "—"}</span>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>/ {l.total} days left</span>
                    </div>
                    {typeof l.total === "number" && (
                      <div style={{ background: "#f1f5f9", borderRadius: 100, height: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 100, background: l.color, width: `${(l.used / l.total) * 100}%`, transition: "width 0.5s ease" }} />
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{l.used} days used</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, width: "fit-content" }}>
                {["requests", "calendar", "team"].map(tab => (
                  <button key={tab} onClick={() => setLeaveTab(tab)} style={{
                    padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: leaveTab === tab ? "white" : "transparent",
                    color: leaveTab === tab ? "#0f172a" : "#64748b",
                    fontSize: 13, fontWeight: leaveTab === tab ? 600 : 400,
                    boxShadow: leaveTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none"
                  }}>{tab === "requests" ? "All Requests" : tab === "calendar" ? "Calendar" : "Team View"}</button>
                ))}
                <button onClick={() => setLeaveModalOpen(true)} style={{
                  marginLeft: 16, padding: "8px 18px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #2563eb, #4f46e5)", color: "white",
                  fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}>+ Apply Leave</button>
              </div>

              {leaveTab === "requests" && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        {["Employee", "Type", "Duration", "Days", "Reason", "Status", "Actions"].map(h => (
                          <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((req) => (
                        <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#475569" }}>{req.avatar}</div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{req.employee}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 4, background: leaveTypeColor(req.type) + "18", color: leaveTypeColor(req.type) }}>{req.type}</span>
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: 13, color: "#374151" }}>{req.from} → {req.to}</td>
                          <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{req.days}d</td>
                          <td style={{ padding: "14px 20px", fontSize: 12, color: "#64748b" }}>{req.reason}</td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
                              background: req.status === "Approved" ? "#f0fdf4" : "#fffbeb",
                              color: req.status === "Approved" ? "#16a34a" : "#d97706"
                            }}>{req.status}</span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            {req.status === "Pending" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => showNotification(`Approved leave for ${req.employee}`)} style={{ padding: "4px 10px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✓</button>
                                <button onClick={() => showNotification(`Rejected leave for ${req.employee}`, "info")} style={{ padding: "4px 10px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✗</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {leaveTab === "calendar" && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px" }}>
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: 14, padding: "40px 0" }}>
                    📅 Leave Calendar — Full calendar view with team overlay<br />
                    <span style={{ fontSize: 12 }}>Coming in next iteration</span>
                  </div>
                </div>
              )}

              {leaveTab === "team" && (
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Team Leave Overview</div>
                  <div style={{ padding: "16px 20px" }}>
                    {employees.map(emp => (
                      <div key={emp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: tierColor(emp.tier) + "44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: tierColor(emp.tier) }}>{emp.avatar}</div>
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#374151" }}>{emp.name}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[...Array(8)].map((_, i) => (
                            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: i < (8 - emp.leaveBalance.cl) ? "#2563eb" : "#e2e8f0" }} />
                          ))}
                          <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4, marginTop: 1 }}>CL</span>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[...Array(8)].map((_, i) => (
                            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: i < (8 - emp.leaveBalance.sl) ? "#059669" : "#e2e8f0" }} />
                          ))}
                          <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 4, marginTop: 1 }}>SL</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== REPORTS ===== */}
          {activeNav === "reports" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { title: "Monthly Attendance Report", desc: "Individual attendance for all employees. Auto-generated last working day of month.", icon: "📋", badge: "Auto", badgeColor: "#2563eb" },
                  { title: "Weekly Late Arrival Summary", desc: "List of all late arrivals sent to HR every Saturday at 6:00 PM.", icon: "⏱", badge: "Weekly", badgeColor: "#d97706" },
                  { title: "Leave Trend Report", desc: "Consolidated leave data with CL/SL breakdown across the agency.", icon: "📅", badge: "Monthly", badgeColor: "#059669" },
                  { title: "Company-Wide Attendance", desc: "MD-level view with late, absent, and leave trend data for the month.", icon: "🏢", badge: "MD Only", badgeColor: "#7c3aed" },
                ].map(r => (
                  <div key={r.title} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px", display: "flex", gap: 14 }}>
                    <div style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{r.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: r.badgeColor + "18", color: r.badgeColor }}>{r.badge}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>{r.desc}</div>
                      <button onClick={() => showNotification("Report generation queued")} style={{
                        padding: "7px 16px", borderRadius: 7, border: "1px solid #e2e8f0",
                        background: "white", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer"
                      }}>⬇ Generate Report</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Report Preview Table */}
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>February 2026 — Attendance Summary</div>
                  <button onClick={() => showNotification("Exporting as CSV...")} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>Export CSV</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Employee", "Present", "Late", "Absent", "On Leave", "Attendance %"].map(h => (
                        <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const p = Math.floor(Math.random() * 6) + 17;
                      const l = Math.floor(Math.random() * 3) + 1;
                      const a = Math.floor(Math.random() * 2);
                      const ol = 8 - emp.leaveBalance.cl;
                      const pct = Math.round((p / 25) * 100);
                      return (
                        <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{emp.dept}</div>
                          </td>
                          <td style={{ padding: "12px 20px", fontSize: 13, color: "#16a34a", fontWeight: 600 }}>{p}</td>
                          <td style={{ padding: "12px 20px", fontSize: 13, color: "#d97706", fontWeight: 600 }}>{l}</td>
                          <td style={{ padding: "12px 20px", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{a}</td>
                          <td style={{ padding: "12px 20px", fontSize: 13, color: "#2563eb", fontWeight: 600 }}>{ol}</td>
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 100, height: 6 }}>
                                <div style={{ height: "100%", borderRadius: 100, background: pct >= 90 ? "#16a34a" : pct >= 75 ? "#d97706" : "#dc2626", width: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", minWidth: 34 }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== SETTINGS ===== */}
          {activeNav === "settings" && (
            <div style={{ maxWidth: 700 }}>
              {[
                { title: "Work Schedule", items: ["Mon–Sat (Sunday off)", "Check-In: 9:00 AM", "Check-Out: 6:45 PM", "Late threshold: After 9:15 AM"] },
                { title: "Leave Policy", items: ["Casual Leave: 8 days/year", "Sick Leave: 8 days/year", "Unpaid Leave: as required", "Reset: 1st January annually"] },
                { title: "Access Hierarchy", items: ["T1: Managing Director — Full override", "T2: HR — Manage all records", "T3: Manager — Approve team leaves", "T4: Employee — Self-service only"] },
              ].map(s => (
                <div key={s.title} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>{s.title}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {s.items.map(item => (
                      <div key={item} style={{ fontSize: 13, color: "#374151", padding: "8px 12px", background: "#f8fafc", borderRadius: 7, borderLeft: "3px solid #3b82f6" }}>{item}</div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>⚠ Note</div>
                <div style={{ fontSize: 12, color: "#78350f" }}>Settings changes to leave policy and access control require HR Manager or above authorization. All changes are audit-logged.</div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ===== EMPLOYEE DETAIL MODAL ===== */}
      {employeeModalOpen && selectedEmployee && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setEmployeeModalOpen(false)}>
          <div style={{ background: "white", borderRadius: 16, width: 480, padding: "28px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: `linear-gradient(135deg, ${tierColor(selectedEmployee.tier)}, ${tierColor(selectedEmployee.tier)}aa)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 18, fontWeight: 800
              }}>{selectedEmployee.avatar}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{selectedEmployee.name}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{selectedEmployee.role} · {selectedEmployee.dept}</div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: tierColor(selectedEmployee.tier) + "18", color: tierColor(selectedEmployee.tier) }}>
                  Tier {selectedEmployee.tier} · {tierLabel(selectedEmployee.tier)}
                </span>
              </div>
              <button onClick={() => setEmployeeModalOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Today's Status", value: selectedEmployee.status, color: statusColor(selectedEmployee.status) },
                { label: "Check-In", value: selectedEmployee.checkIn || "—", color: "#0f172a" },
                { label: "CL Remaining", value: `${selectedEmployee.leaveBalance.cl} / 8`, color: "#2563eb" },
                { label: "SL Remaining", value: `${selectedEmployee.leaveBalance.sl} / 8`, color: "#059669" },
              ].map(f => (
                <div key={f.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: f.color }}>{f.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setEmployeeModalOpen(false); showNotification(`Leave applied for ${selectedEmployee.name}`); }} style={{ flex: 1, padding: "10px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Apply Leave</button>
              <button onClick={() => { setEmployeeModalOpen(false); showNotification("Profile editor coming in v1.1"); }} style={{ flex: 1, padding: "10px", background: "#f8fafc", color: "#374151", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== APPLY LEAVE MODAL ===== */}
      {leaveModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLeaveModalOpen(false)}>
          <div style={{ background: "white", borderRadius: 16, width: 440, padding: "28px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Apply for Leave</div>
              <button onClick={() => setLeaveModalOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
            {[
              { label: "Leave Type", type: "select", options: ["Casual Leave (CL)", "Sick Leave (SL)", "Unpaid Leave (UL)"] },
              { label: "From Date", type: "date" },
              { label: "To Date", type: "date" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{f.label}</label>
                {f.type === "select" ? (
                  <select style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none" }}>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type="date" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
                )}
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Reason (Optional)</label>
              <textarea rows={3} placeholder="Add a note..." style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none", resize: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#92400e" }}>
              ⚠ Your leave request will be sent to your Manager for approval. You'll be notified once a decision is made.
            </div>
            <button onClick={() => { setLeaveModalOpen(false); showNotification("Leave request submitted successfully!"); }} style={{
              width: "100%", padding: "12px", background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer"
            }}>Submit Request</button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
}

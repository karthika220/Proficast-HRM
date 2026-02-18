import { useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { UserContext } from "../context/UserContext";

export default function Attendance() {
  const { user } = useContext(UserContext);
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchTodayAttendance();
      fetchAttendance();
    }
  }, [month, user?.id]);

  const fetchTodayAttendance = async () => {
    try {
      const res = await api.get("/attendance/today");
      // Handle multiple sessions - get the most recent active session
      const sessions = Array.isArray(res.data) ? res.data : [res.data];
      const activeSession = sessions.find(session => 
        session.checkIn && !session.checkOut
      ) || sessions[sessions.length - 1]; // fallback to last session
      setTodayRecord(activeSession);
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
      setTodayRecord(null);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get("/attendance/monthly", {
        params: {
          month: month.getMonth() + 1,
          year: month.getFullYear(),
        },
      });
      setRecords(res.data.attendances || res.data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const res = await api.post("/attendance/checkin");
      showNotification(`Checked in at ${new Date(res.data.attendance.checkIn).toLocaleTimeString()}`);
      await fetchTodayAttendance();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Check-in failed");
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      
      // Check if currently on break - if so, this is resume work
      if (todayRecord?.breakStartTime && !todayRecord?.breakEndTime) {
        const res = await api.post("/attendance/checkout");
        showNotification(`Work resumed at ${currentTime.toLocaleTimeString()}`);
      } else if (todayRecord?.checkIn && !todayRecord?.checkOut) {
        // Active session - determine checkout type based on time
        let checkoutType = 'FINAL';
        let breakType = 'LUNCH';
        
        // If checkout is in afternoon (12:00 PM - 3:00 PM), treat as lunch break
        if (currentHour >= 12 && currentHour <= 15) {
          checkoutType = 'BREAK';
          breakType = 'LUNCH';
          showNotification(`Lunch break started at ${currentTime.toLocaleTimeString()}`);
          
          // Start lunch break timer for notification
          setTimeout(async () => {
            try {
              // Check if user is still on break after 1 hour
              const updatedRecord = await api.get("/attendance/today");
              const sessions = Array.isArray(updatedRecord.data) ? updatedRecord.data : [updatedRecord.data];
              const activeSession = sessions.find(session => 
                session.checkIn && !session.checkOut
              );
              if (activeSession && activeSession.breakStartTime && !activeSession.breakEndTime) {
                showNotification('⏰ Reminder: Please check in after your lunch break');
              }
            } catch (error) {
              console.error('Error checking lunch break status:', error);
            }
          }, 60 * 60 * 1000); // 1 hour
        } else {
          showNotification(`Checked out at ${currentTime.toLocaleTimeString()}`);
        }
        
        // Make API call with appropriate parameters
        const res = await api.post("/attendance/checkout", { 
          checkoutType,
          breakType: checkoutType === 'BREAK' ? breakType : undefined
        });
      } else {
        showNotification('No active check-in session found');
      }
      
      await fetchTodayAttendance();
    } catch (err) {
      alert(err.response?.data?.message || "Check-out failed");
    } finally {
      setCheckInLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1));
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const formatMinutes = (mins) => {
    if (mins <= 0) return '0h 0m';
    const hours = Math.floor(mins / 60);
    const minutes = Math.round(mins % 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Present":
        return "#16a34a";
      case "Late":
        return "#d97706";
      case "Absent":
        return "#dc2626";
      default:
        return "#64748b";
    }
  };

  const checkedInToday = !!todayRecord?.checkIn && !todayRecord?.checkOut;
  const checkedOutToday = !!todayRecord?.checkIn && !!todayRecord?.checkOut;
  const onBreak = todayRecord?.breakStartTime && !todayRecord?.breakEndTime;
  const isCurrentlyWorking = checkedInToday && !onBreak;

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#10b981",
            color: "white",
            padding: "14px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 100,
            animation: "slideIn 0.3s ease",
          }}
        >
          ✓ {notification}
        </div>
      )}

      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: 0, marginBottom: 32 }}>
        Attendance
      </h1>

      {/* Single Column Layout */}
      <div style={{ display: "block" }}>
        {/* Attendance Log Table */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 4 }}>
              My Attendance Log
            </h2>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
              {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Month Selector */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 20px",
              borderBottom: "1px solid #f1f5f9",
              background: "#f8fafc",
            }}
          >
            <button
              onClick={handlePrevMonth}
              style={{
                padding: "6px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                background: "white",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
              {month.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
            <button
              onClick={handleNextMonth}
              style={{
                padding: "6px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                background: "white",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Next →
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
              Loading...
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
              No attendance records for this month
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Date", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const checkIn = record.checkIn ? new Date(record.checkIn) : null;
                  const checkOut = record.checkOut ? new Date(record.checkOut) : null;
                  let hours = "—";
                  
                  if (checkIn && checkOut) {
                    const totalMinutes = Math.round((checkOut - checkIn) / (1000 * 60));
                    const breakMinutes = record.totalBreakMinutes || record.breakMinutes || 0;
                    const workedMinutes = Math.max(0, totalMinutes - breakMinutes);
                    hours = formatMinutes(workedMinutes);
                  }

                  return (
                    <tr
                      key={record.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                          {new Date(record.date || record.checkIn).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {new Date(record.date || record.checkIn).toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>
                        {checkIn ? checkIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "#374151" }}>
                        {checkOut ? checkOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "#64748b" }}>
                        {checkIn && checkOut ? (
                          <div>
                            <div style={{ fontWeight: 600, color: "#10b981" }}>
                              💼 {formatMinutes(Math.round((record.totalWorkHours || 0) * 60))}
                            </div>
                            {(record.totalBreakMinutes > 0 || record.breakMinutes > 0) && (
                              <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 1 }}>
                                🟡 {formatMinutes(record.totalBreakMinutes || record.breakMinutes || 0)}
                              </div>
                            )}
                            {record.overtimeHours > 0 && (
                              <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 1 }}>
                                ⏱ {formatMinutes(Math.round(record.overtimeHours * 60))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: getStatusColor(record.status) + "18",
                            color: getStatusColor(record.status),
                          }}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

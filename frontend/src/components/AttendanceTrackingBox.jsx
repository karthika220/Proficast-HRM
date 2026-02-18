import { useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { UserContext } from "../context/UserContext";

export default function AttendanceTrackingBox() {
  const { user } = useContext(UserContext);
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
    }
  }, [user?.id]);

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
              
              if (activeSession?.breakStartTime && !activeSession?.breakEndTime) {
                showNotification("⏰ Lunch break hour completed! Consider resuming work.", "info");
              }
            } catch (error) {
              console.error("Error checking break status:", error);
            }
          }, 60 * 60 * 1000); // 1 hour
        } else {
          // Final checkout
          checkoutType = 'FINAL';
          showNotification(`Checked out at ${currentTime.toLocaleTimeString()}`);
        }
        
        const res = await api.post("/attendance/checkout", {
          checkoutType,
          breakType
        });
        await fetchTodayAttendance();
      }
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Check-out failed");
    } finally {
      setCheckInLoading(false);
    }
  };

  const showNotification = (msg, type = "success") => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const formatTime = (d) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  
  const formatDate = (d) =>
    d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatMinutes = (mins) => {
    if (mins <= 0) return '0h 0m';
    const hours = Math.floor(mins / 60);
    const minutes = Math.round(mins % 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  // Helper states
  const checkedInToday = todayRecord?.checkIn;
  const checkedOutToday = todayRecord?.checkOut;
  const onBreak = todayRecord?.breakStartTime && !todayRecord?.breakEndTime;
  const isCurrentlyWorking = checkedInToday && !checkedOutToday && !onBreak;

  return (
    <div className="card" style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          Today's Attendance
        </h3>
        <span style={{ fontSize: '14px', color: '#6b7280', background: '#f3f4f6', padding: '6px 12px', borderRadius: '6px' }}>
          {formatDate(currentTime)}
        </span>
      </div>

      {/* Progress Bar with Percentage */}
      {todayRecord?.checkIn && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Daily Progress
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              {(() => {
                const totalMinutes = Math.round((todayRecord.totalWorkHours || 0) * 60) + (todayRecord.totalBreakMinutes || todayRecord.breakMinutes || 0) + Math.round((todayRecord.overtimeHours || 0) * 60);
                const workMinutes = Math.round((todayRecord.totalWorkHours || 0) * 60);
                return totalMinutes > 0 ? `${Math.round((workMinutes / totalMinutes) * 100)}%` : '0%';
              })()}
            </span>
          </div>
          <div style={{
            height: '8px',
            backgroundColor: '#f1f5f9',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Working Time */}
            {todayRecord.totalWorkHours > 0 && (
              <div style={{
                height: '100%',
                width: `${Math.min(100, (Math.round(todayRecord.totalWorkHours * 60) / (Math.round(todayRecord.totalWorkHours * 60) + (todayRecord.totalBreakMinutes || todayRecord.breakMinutes || 0) + Math.round((todayRecord.overtimeHours || 0) * 60))) * 100)}%`,
                backgroundColor: '#10b981',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            )}
            {/* Break Time */}
            {(todayRecord.totalBreakMinutes > 0 || todayRecord.breakMinutes > 0) && (
              <div style={{
                height: '100%',
                width: `${Math.min(100, ((todayRecord.totalBreakMinutes || todayRecord.breakMinutes || 0) / (Math.round(todayRecord.totalWorkHours * 60) + (todayRecord.totalBreakMinutes || todayRecord.breakMinutes || 0) + Math.round((todayRecord.overtimeHours || 0) * 60))) * 100)}%`,
                backgroundColor: '#fbbf24',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            )}
            {/* Overtime */}
            {todayRecord.overtimeHours > 0 && (
              <div style={{
                height: '100%',
                width: `${Math.min(100, (Math.round(todayRecord.overtimeHours * 60) / (Math.round(todayRecord.totalWorkHours * 60) + (todayRecord.totalBreakMinutes || todayRecord.breakMinutes || 0) + Math.round((todayRecord.overtimeHours || 0) * 60))) * 100)}%`,
                backgroundColor: '#a78bfa',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            )}
          </div>
        </div>
      )}

      {/* Three-Column Time Breakdown */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '20px', 
        marginBottom: '24px' 
      }}>
        {/* Working Time */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a', marginBottom: '8px' }}>
            💼
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>
            {formatMinutes(Math.round((todayRecord.totalWorkHours || 0) * 60))}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Working Time
          </div>
        </div>

        {/* Break Time */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', marginBottom: '8px' }}>
            🟡
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
            {formatMinutes(todayRecord.totalBreakMinutes || todayRecord.breakMinutes || 0)}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Break Time
          </div>
        </div>

        {/* Overtime */}
        <div style={{
          background: '#f3e8ff',
          border: '1px solid #c7d2fe',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#6366f1', marginBottom: '8px' }}>
            ⏱
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#4f46e5', marginBottom: '4px' }}>
            {formatMinutes(Math.round((todayRecord.overtimeHours || 0) * 60))}
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Overtime
          </div>
        </div>
      </div>

      {/* Centered Action Button */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <button
          onClick={checkedOutToday ? () => showNotification("Already checked out") : 
                 onBreak ? handleCheckOut : 
                 isCurrentlyWorking ? handleCheckOut : 
                 handleCheckIn}
          disabled={checkInLoading || checkedOutToday}
          style={{
            padding: '16px 48px',
            borderRadius: '10px',
            border: 'none',
            cursor: checkInLoading || checkedOutToday ? 'not-allowed' : 'pointer',
            background: checkedOutToday ? '#94a3b8' : 
                       onBreak ? '#059669' : 
                       isCurrentlyWorking ? '#dc2626' : '#2563eb',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            opacity: checkInLoading || checkedOutToday ? 0.7 : 1,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)'
          }}
          onMouseOver={(e) => {
            if (!checkInLoading && !checkedOutToday) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 12px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
          }}
        >
          {checkInLoading ? "Processing..." : 
           checkedOutToday ? "✓ Checked Out" : 
           onBreak ? "▶ Resume Work" : 
           isCurrentlyWorking ? "⏸ Take Break" : 
           "▶ Check In"}
        </button>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
          Shift: Mon–Sat · 9:00 AM – 6:45 PM
        </div>
      </div>

      {/* Status Info */}
      {todayRecord?.checkIn && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            ✓ Checked in since {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          {onBreak && (
            <div style={{ fontSize: '13px', color: '#f87171' }}>
              ⏸ On Break Since {todayRecord.breakStartTime && 
                new Date(todayRecord.breakStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

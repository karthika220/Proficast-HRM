import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function DashboardAttendanceTimeline() {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [breakType, setBreakType] = useState('lunch'); // 'lunch' or 'permission'
  const [showBreakOptions, setShowBreakOptions] = useState(false);
  const [permissionMinutes, setPermissionMinutes] = useState(30); // Custom permission minutes

  // Office timing constants
  const OFFICE_START = '09:00 AM';
  const OFFICE_END = '06:45 PM';
  const TOTAL_OFFICE_MINUTES = 585; // 9:45 hours = 585 minutes

  useEffect(() => {
    fetchTodayAttendance();
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // Update progress if currently checked in
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      const progressInterval = setInterval(() => {
        updateLiveProgress();
      }, 60000); // Update every minute

      return () => clearInterval(progressInterval);
    }
  }, [todayAttendance]);

  useEffect(() => {
    // Animate progress bar when data loads
    if (todayAttendance) {
      const targetProgress = calculateProgressPercentage();
      const duration = 1500; // 1.5 seconds
      const steps = 30;
      const increment = targetProgress / steps;
      let currentStep = 0;

      const animationInterval = setInterval(() => {
        currentStep++;
        setAnimatedProgress(prev => Math.min(prev + increment, targetProgress));
        
        if (currentStep >= steps) {
          clearInterval(animationInterval);
          setAnimatedProgress(targetProgress);
        }
      }, duration / steps);

      return () => clearInterval(animationInterval);
    }
  }, [todayAttendance]);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/today');
      const attendance = response.data;
      
      setTodayAttendance(attendance);
      
      // Check if currently checked in and not checked out
      const currentlyActive = attendance?.checkIn && !attendance?.checkOut;
      setIsLive(currentlyActive);
      
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
      // Set default empty state
      setTodayAttendance({
        date: new Date(),
        status: 'Pending',
        checkIn: null,
        checkOut: null,
        breakMinutes: 0,
        isLate: false,
        lateMinutes: 0,
        checkInCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      if (!todayAttendance?.checkIn) {
        // Check In
        const res = await api.post("/attendance/checkin");
        setTodayAttendance(prev => ({
          ...prev,
          checkIn: new Date(),
          status: 'PRESENT',
          breakMinutes: 0,
          overtimeMinutes: 0
        }));
        setIsLive(true);
      } else if (todayAttendance?.breakStartTime && !todayAttendance?.breakEndTime) {
        // Resume from break
        const res = await api.post("/attendance/checkout", {
          checkoutType: "FINAL"
        });
        setTodayAttendance(prev => ({
          ...prev,
          breakEndTime: new Date(),
          totalBreakMinutes: (prev.totalBreakMinutes || 0) + Math.round((new Date() - new Date(prev.breakStartTime)) / (1000 * 60)),
          breakStartTime: null,
          status: 'PRESENT'
        }));
        setShowBreakOptions(false);
      } else {
        // Check Out - show break options or proceed with checkout
        if (!showBreakOptions) {
          setShowBreakOptions(true);
          setCheckInLoading(false);
          return;
        }
        
        // Proceed with BREAK checkout
        const checkoutData = {
          checkoutType: "BREAK",
          breakType: breakType.toUpperCase()
        };
        
        // Add permission minutes for permission breaks
        if (breakType === 'permission') {
          checkoutData.permissionMinutes = permissionMinutes;
        }
        
        const res = await api.post("/attendance/checkout", checkoutData);
        
        if (res.data.action === 'break_checkout') {
          // Break checkout - update UI to show break state
          setTodayAttendance(prev => ({
            ...prev,
            breakStartTime: new Date(),
            status: 'ON_BREAK',
            breakType: breakType.toUpperCase()
          }));
          setShowBreakOptions(false);
        } else if (res.data.action === 'final_checkout') {
          // Final checkout
          setTodayAttendance(prev => ({
            ...prev,
            checkOut: new Date(),
            status: 'PRESENT'
          }));
          setIsLive(false);
          setShowBreakOptions(false);
        }
      }
      
      // Refresh data to get latest state
      await fetchTodayAttendance();
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    } finally {
      setCheckInLoading(false);
    }
  };

  const getButtonText = () => {
    if (checkInLoading) return "Processing...";
    
    if (!todayAttendance?.checkIn) {
      return "Check In";
    }
    
    if (todayAttendance?.status === 'OnBreak' || todayAttendance?.status === 'ON_BREAK' || (todayAttendance?.breakStartTime && !todayAttendance?.breakEndTime)) {
      return "Resume Work";
    }
    
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      return showBreakOptions ? "Confirm Break Type" : "Take Break";
    }
    
    return "Check In";
  };

  const getButtonColor = () => {
    if (!todayAttendance?.checkIn) {
      return "#2563eb"; // Blue for Check In
    }
    
    if (todayAttendance?.status === 'OnBreak' || (todayAttendance?.breakStartTime && !todayAttendance?.breakEndTime)) {
      return "#059669"; // Green for Resume
    }
    
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      return "#f97316"; // Orange for Check Out
    }
    
    return "#2563eb"; // Default blue
  };

  const updateLiveProgress = () => {
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      const progress = calculateProgressPercentage();
      setAnimatedProgress(progress);
    }
  };

  const calculateWorkedMinutes = () => {
    if (!todayAttendance?.checkIn) return 0;
    
    const checkInDate = new Date(todayAttendance.checkIn);
    let endTime;
    
    if (!todayAttendance?.checkOut) {
      // If no checkout, use current time
      endTime = new Date();
    } else {
      endTime = new Date(todayAttendance.checkOut);
    }
    
    let totalMinutes = Math.max(0, (endTime - checkInDate) / (1000 * 60));
    
    // Subtract break minutes
    const breakMinutes = todayAttendance.totalBreakMinutes || todayAttendance.breakMinutes || 0;
    totalMinutes = Math.max(0, totalMinutes - breakMinutes);
    
    return totalMinutes;
  };

  const calculateProgressPercentage = () => {
    const workedMinutes = calculateWorkedMinutes();
    return Math.min((workedMinutes / TOTAL_OFFICE_MINUTES) * 100, 100);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatWorkedHours = (minutes) => {
    if (minutes <= 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  };

  // Helper function to format minutes consistently
  const formatMinutes = (mins) => {
    if (mins <= 0) return '0h 0m';
    const hours = Math.floor(mins / 60);
    const minutes = Math.round(mins % 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusColor = () => {
    if (!todayAttendance) return '#64748b';
    
    const onBreak = todayAttendance.breakStartTime && !todayAttendance.breakEndTime;
    
    if (onBreak) {
      return todayAttendance.breakType === 'LUNCH' ? '#d97706' : '#8b5cf6'; // Orange for lunch, purple for permission
    }
    
    if (isLive) {
      return '#3b82f6'; // Blue for live
    }
    
    if (todayAttendance.checkIn && todayAttendance.checkOut) {
      const overtime = todayAttendance.overtimeMinutes || 0;
      if (overtime > 0) {
        return '#7c3aed'; // Purple for overtime
      }
      return '#059669'; // Green for completed
    }
    
    switch (todayAttendance.status) {
      case 'Present': return '#059669';
      case 'PRESENT': return '#059669';
      case 'Absent': return '#ef4444';
      case 'ABSENT': return '#ef4444';
      case 'HalfDay': return '#f59e0b';
      case 'HALFDAY': return '#f59e0b';
      case 'Early': return '#3b82f6';
      case 'EARLY': return '#3b82f6';
      case 'OnBreak': return '#d97706';
      case 'ON_BREAK': return '#d97706';
      default: return '#64748b';
    }
  };

  const getStatusText = () => {
    if (!todayAttendance) return 'Loading...';
    
    const onBreak = todayAttendance.breakStartTime && !todayAttendance.breakEndTime;
    
    if (onBreak) {
      const breakTypeText = todayAttendance.breakType === 'LUNCH' ? 'Lunch' : 'Permission';
      return `${breakTypeText} Break • ${formatMinutes(todayAttendance.totalBreakMinutes || todayAttendance.breakMinutes || 0)}`;
    }
    
    if (isLive) {
      return `Live • ${formatMinutes(calculateWorkedMinutes())}`;
    }
    
    if (todayAttendance.checkIn && todayAttendance.checkOut) {
      const totalHours = formatMinutes(calculateWorkedMinutes());
      const breakTime = todayAttendance.totalBreakMinutes || todayAttendance.breakMinutes || 0;
      const overtime = todayAttendance.overtimeMinutes || 0;
      
      let status = totalHours;
      if (breakTime > 0) status += ` • Break: ${formatMinutes(breakTime)}`;
      if (overtime > 0) status += ` • OT: ${formatMinutes(overtime)}`;
      
      return status;
    }
    
    return todayAttendance.status;
  };

  if (loading) {
    return (
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Loading today's attendance...</div>
        </div>
      </div>
    );
  }

  const workedMinutes = calculateWorkedMinutes();
  const progressPercentage = calculateProgressPercentage();

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ padding: '20px' }}>
        {/* Header with Live Indicator */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px' 
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 700, 
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Today's Attendance
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}
                />
                <span style={{ 
                  fontSize: '12px', 
                  color: '#ef4444', 
                  fontWeight: 600 
                }}>
                  LIVE
                </span>
              </div>
            )}
          </h3>
          
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            {formatDate(todayAttendance?.date || new Date())}
          </div>
        </div>

        {/* Main Attendance Row */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          padding: '20px 0',
          opacity: 0,
          animation: 'fadeInUp 0.8s ease-out forwards',
          position: 'relative'
        }}>
          {/* Status Indicator */}
          <div style={{ 
            minWidth: '100px', 
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 700, 
              color: getStatusColor(),
              marginBottom: '4px'
            }}>
              {todayAttendance?.status || 'Pending'}
            </div>
            {todayAttendance?.isLate && (
              <div style={{ 
                fontSize: '11px', 
                color: '#f59e0b',
                fontWeight: 500
              }}>
                +{formatMinutes(todayAttendance.lateMinutes || 0)} late
              </div>
            )}
          </div>

          {/* Timeline with Progress Bar */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            position: 'relative'
          }}>
            {/* Check-in Time */}
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#1e293b',
              minWidth: '70px',
              textAlign: 'center'
            }}>
              {todayAttendance?.checkIn ? formatTime(todayAttendance.checkIn) : '--:--'}
            </div>

            {/* Enhanced Progress Bar Container */}
            <div style={{ 
              flex: 1, 
              height: '12px', 
              backgroundColor: '#f1f5f9', 
              borderRadius: '6px',
              position: 'relative',
              minWidth: '200px',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }}>
              {/* Time Markers */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: 0,
                fontSize: '10px',
                color: '#94a3b8',
                fontWeight: 500
              }}>
                {OFFICE_START}
              </div>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: 0,
                fontSize: '10px',
                color: '#94a3b8',
                fontWeight: 500
              }}>
                {OFFICE_END}
              </div>

              {/* Animated Gradient Progress Bar */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${animatedProgress}%`,
                background: isLive 
                  ? 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)'
                  : 'linear-gradient(90deg, #059669 0%, #10b981 50%, #059669 100%)',
                borderRadius: '6px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isLive 
                  ? '0 0 20px rgba(59, 130, 246, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)'
                  : '0 2px 8px rgba(5, 150, 105, 0.3)',
                animation: isLive ? 'shimmer 2s infinite' : 'none'
              }}>
                {/* Glow Effect at Active Edge */}
                {isLive && (
                  <div style={{
                    position: 'absolute',
                    right: '-2px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#60a5fa',
                    borderRadius: '50%',
                    boxShadow: '0 0 12px rgba(96, 165, 250, 0.8)',
                    animation: 'pulse 1.5s infinite'
                  }} />
                )}
              </div>
            </div>

            {/* Current Time / Check-out Time */}
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: isLive ? '#3b82f6' : '#1e293b',
              minWidth: '70px',
              textAlign: 'center'
            }}>
              {isLive ? formatTime(currentTime) : 
               (todayAttendance?.checkOut ? formatTime(todayAttendance.checkOut) : '--:--')}
            </div>
          </div>

          {/* Total Hours */}
          <div style={{ 
            minWidth: '80px',
            textAlign: 'right'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: getStatusColor()
            }}>
              {getStatusText()}
            </div>
            {todayAttendance?.breakMinutes > 0 && (
              <div style={{ 
                fontSize: '11px', 
                color: '#64748b',
                marginTop: '2px'
              }}>
                {formatMinutes(todayAttendance.breakMinutes)} break
              </div>
            )}
          </div>
        </div>

        {/* Summary Bar */}
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '16px', 
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px'
        }}>
          <div style={{ color: '#64748b' }}>
            Office Hours: {OFFICE_START} → {OFFICE_END}
          </div>
          <div style={{ 
            fontWeight: 600, 
            color: '#0f172a' 
          }}>
            Progress: {Math.round(progressPercentage)}% • {formatMinutes(workedMinutes)} / 9h 45m
          </div>
        </div>

        {/* Time Breakdown Display */}
        <div style={{ 
          marginTop: '16px', 
          padding: '16px', 
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          <div style={{ 
            fontWeight: 600, 
            color: '#0f172a', 
            marginBottom: '12px',
            fontSize: '14px'
          }}>
            Time Breakdown
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '16px' 
          }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                Working Time
              </div>
              <div style={{ 
                fontWeight: 600, 
                color: '#059669',
                fontSize: '14px'
              }}>
                {formatMinutes(workedMinutes)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                Break Time
              </div>
              <div style={{ 
                fontWeight: 600, 
                color: '#d97706',
                fontSize: '14px'
              }}>
                {formatMinutes(todayAttendance?.totalBreakMinutes || todayAttendance?.breakMinutes || 0)}
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>
                Overtime
              </div>
              <div style={{ 
                fontWeight: 600, 
                color: '#7c3aed',
                fontSize: '14px'
              }}>
                {formatMinutes(todayAttendance?.overtimeMinutes || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Check-In/Check-Out Button */}
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center'
        }}>
          <button
            onClick={handleCheckIn}
            disabled={checkInLoading || (todayAttendance?.checkIn && todayAttendance?.checkOut)}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              cursor: (checkInLoading || (todayAttendance?.checkIn && todayAttendance?.checkOut)) ? 'not-allowed' : 'pointer',
              background: getButtonColor(),
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              minWidth: '140px',
              transition: 'all 0.2s ease',
              opacity: (checkInLoading || (todayAttendance?.checkIn && todayAttendance?.checkOut)) ? 0.7 : 1,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              if (!checkInLoading && !(todayAttendance?.checkIn && todayAttendance?.checkOut)) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            {getButtonText()}
          </button>

          {/* Break Type Selection */}
          {showBreakOptions && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '12px'
              }}>
                Select Break Type:
              </div>
              <div style={{
                display: 'flex',
                gap: '12px',
                flexDirection: 'column'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: breakType === 'lunch' ? '#fef3c7' : 'transparent',
                  border: breakType === 'lunch' ? '1px solid #f59e0b' : '1px solid #e2e8f0'
                }}>
                  <input
                    type="radio"
                    name="breakType"
                    value="lunch"
                    checked={breakType === 'lunch'}
                    onChange={(e) => setBreakType(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                      🍽️ Lunch Break
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Duration: 1 hour
                    </div>
                  </div>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: breakType === 'permission' ? '#ede9fe' : 'transparent',
                  border: breakType === 'permission' ? '1px solid #8b5cf6' : '1px solid #e2e8f0'
                }}>
                  <input
                    type="radio"
                    name="breakType"
                    value="permission"
                    checked={breakType === 'permission'}
                    onChange={(e) => setBreakType(e.target.value)}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                      📋 Permission Break
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      Custom duration
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={permissionMinutes}
                      onChange={(e) => setPermissionMinutes(parseInt(e.target.value) || 30)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '80px',
                        padding: '4px 8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                      disabled={breakType !== 'permission'}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>minutes</span>
                  </div>
                </label>
              </div>
              
              <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={async () => {
                    setCheckInLoading(true);
                    try {
                      const checkoutData = {
                        checkoutType: "FINAL"
                      };
                      
                      const res = await api.post("/attendance/checkout", checkoutData);
                      
                      if (res.data.action === 'final_checkout') {
                        setTodayAttendance(prev => ({
                          ...prev,
                          checkOut: new Date(),
                          status: 'PRESENT'
                        }));
                        setIsLive(false);
                        setShowBreakOptions(false);
                      }
                    } catch (err) {
                      alert(err.response?.data?.message || "Final checkout failed");
                    } finally {
                      setCheckInLoading(false);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #dc2626',
                    backgroundColor: 'white',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Final Checkout
                </button>
                
                <button
                  onClick={() => setShowBreakOptions(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #6b7280',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: 200px 0;
          }
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { UserContext } from '../context/UserContext';

export default function AttendanceTimeline() {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(UserContext);

  useEffect(() => {
    fetchTimelineData();
  }, []);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/timeline');
      setTimelineData(response.data);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getTimelinePosition = (time, officeStart = 9, officeEnd = 18.75) => {
    if (!time) return 0;
    const hours = new Date(time).getHours() + new Date(time).getMinutes() / 60;
    const totalHours = officeEnd - officeStart;
    const position = ((hours - officeStart) / totalHours) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const calculateOvertime = (checkOutTime) => {
    if (!checkOutTime) return 0;
    const checkout = new Date(checkOutTime);
    const overtimeEnd = new Date(checkout);
    overtimeEnd.setHours(18, 45, 0, 0); // 6:45 PM
    
    if (checkout > overtimeEnd) {
      const overtimeMs = checkout - overtimeEnd;
      return Math.round(overtimeMs / (1000 * 60)); // minutes
    }
    return 0;
  };

  const renderSingleTimeline = (attendance, userName = null) => {
    const hasCheckIn = attendance?.checkIn;
    const hasBreakStart = attendance?.breakStart;
    const hasBreakEnd = attendance?.breakEnd;
    const hasCheckOut = attendance?.checkOut;
    
    // Use backend overtime data if available, otherwise calculate
    const overtimeMinutes = attendance?.overtimeHours ? Math.round(attendance.overtimeHours * 60) : calculateOvertime(attendance?.checkOut);
    
    // Calculate lunch break duration if available
    const lunchBreakMinutes = attendance?.breakMinutes || 0;
    const isLunchBreak = attendance?.breakType === 'LUNCH' || false;
    
    // Calculate session duration for progress bar
    const sessionDuration = hasCheckIn && hasCheckOut ? 
      Math.round((new Date(hasCheckOut) - new Date(hasCheckIn)) / (1000 * 60)) : 0;
    
    // Calculate working time (session duration minus breaks)
    const workingTime = Math.max(0, sessionDuration - lunchBreakMinutes);
    
    // Use backend totalWorkHours if available
    const backendWorkHours = attendance?.totalWorkHours || 0;
    const backendWorkMinutes = Math.round(backendWorkHours * 60);

    return (
      <div style={{ marginBottom: '20px' }}>
        {userName && (
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '700',
              color: '#6b7280'
            }}>
              {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            {userName}
          </div>
        )}
        
        {/* Timeline Container */}
        <div style={{ 
          position: 'relative', 
          height: '40px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Office Hours Line */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '0',
            right: '0',
            height: '2px',
            background: '#e2e8f0',
            transform: 'translateY(-50%)'
          }} />

          {/* Progress Line with Multiple Segments */}
          {hasCheckIn && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '0',
              height: '2px',
              background: '#e2e8f0',
              transform: 'translateY(-50%)',
              display: 'flex',
              width: '100%'
            }}>
              {/* Working Time Segment */}
              {backendWorkMinutes > 0 && (
                <div style={{
                  backgroundColor: '#10b981',
                  borderRadius: '3px',
                  height: '100%',
                  width: `${(backendWorkMinutes / (backendWorkMinutes + lunchBreakMinutes + overtimeMinutes)) * 100}%`
                }} />
              )}
              {/* Break Time Segment */}
              {lunchBreakMinutes > 0 && (
                <div style={{
                  backgroundColor: '#fbbf24',
                  borderRadius: '3px',
                  height: '100%',
                  width: `${(lunchBreakMinutes / (backendWorkMinutes + lunchBreakMinutes + overtimeMinutes)) * 100}%`
                }} />
              )}
              {/* Overtime Segment */}
              {overtimeMinutes > 0 && (
                <div style={{
                  backgroundColor: '#a78bfa',
                  borderRadius: '3px',
                  height: '100%',
                  width: `${(overtimeMinutes / (backendWorkMinutes + lunchBreakMinutes + overtimeMinutes)) * 100}%`
                }} />
              )}
            </div>
          )}

          {/* Check-in Marker */}
          {hasCheckIn && (
            <div style={{
              position: 'absolute',
              left: `${getTimelinePosition(hasCheckIn)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                fontWeight: '600',
                color: '#059669',
                whiteSpace: 'nowrap'
              }}>
                {formatTime(hasCheckIn)}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: '#6b7280',
                whiteSpace: 'nowrap'
              }}>
                Check-in
              </div>
            </div>
          )}

          {/* Break Start Marker */}
          {hasBreakStart && (
            <div style={{
              position: 'absolute',
              left: `${getTimelinePosition(hasBreakStart)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#f59e0b',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                fontWeight: '600',
                color: '#d97706',
                whiteSpace: 'nowrap'
              }}>
                {formatTime(hasBreakStart)}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: '#6b7280',
                whiteSpace: 'nowrap'
              }}>
                Break
              </div>
            </div>
          )}

          {/* Break End Marker */}
          {hasBreakEnd && (
            <div style={{
              position: 'absolute',
              left: `${getTimelinePosition(hasBreakEnd)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#3b82f6',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                fontWeight: '600',
                color: '#2563eb',
                whiteSpace: 'nowrap'
              }}>
                {formatTime(hasBreakEnd)}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: '#6b7280',
                whiteSpace: 'nowrap'
              }}>
                Resume
              </div>
            </div>
          )}

          {/* Check-out Marker */}
          {hasCheckOut && (
            <div style={{
              position: 'absolute',
              left: `${getTimelinePosition(hasCheckOut)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} />
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                fontWeight: '600',
                color: '#dc2626',
                whiteSpace: 'nowrap'
              }}>
                {formatTime(hasCheckOut)}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: '#6b7280',
                whiteSpace: 'nowrap'
              }}>
                Checkout
              </div>
            </div>
          )}

          {/* Overtime Section */}
          {overtimeMinutes > 0 && (
            <div style={{
              position: 'absolute',
              right: '0',
              top: '0',
              bottom: '0',
              width: '60px',
              background: 'linear-gradient(90deg, rgba(239,68,68,0.1), rgba(239,68,68,0.2))',
              borderLeft: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: '600',
              color: '#dc2626'
            }}>
              +{Math.floor(overtimeMinutes / 60)}h {overtimeMinutes % 60}m
            </div>
          )}
        </div>

        {/* Enhanced Timeline Legend */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          marginTop: '8px', 
          fontSize: '10px',
          color: '#6b7280',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span>Check-in</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            <span>Break</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
            <span>Resume</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <span>Checkout</span>
          </div>
          {backendWorkMinutes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
              <span>Working ({formatMinutes(backendWorkMinutes)})</span>
            </div>
          )}
          {lunchBreakMinutes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#fbbf24' }} />
              <span>Break ({formatMinutes(lunchBreakMinutes)})</span>
            </div>
          )}
          {overtimeMinutes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#a78bfa' }} />
              <span>Overtime (+{formatMinutes(overtimeMinutes)})</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card" style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
          Attendance Timeline
        </h3>
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
          Loading timeline...
        </div>
      </div>
    );
  }

  if (!timelineData) {
    return (
      <div className="card" style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
          Attendance Timeline
        </h3>
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
          No attendance data available
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      background: 'white',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
        Attendance Timeline
      </h3>
      
      {user?.role === 'EMPLOYEE' ? (
        // Employee view - single timeline
        timelineData.attendance ? (
          renderSingleTimeline(timelineData.attendance)
        ) : (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
            No attendance record for today
          </div>
        )
      ) : (
        // HR/Manager/MD view - multiple timelines
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {timelineData.attendances && timelineData.attendances.length > 0 ? (
            timelineData.attendances.map((record) => (
              <div key={record.id}>
                {renderSingleTimeline(record, record.user?.fullName)}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              No attendance records for today
            </div>
          )}
        </div>
      )}
    </div>
  );
}

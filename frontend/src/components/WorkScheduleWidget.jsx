import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function WorkScheduleWidget() {
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeekSchedule();
  }, []);

  const fetchWeekSchedule = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

      const weekPromises = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        weekPromises.push(fetchDayAttendance(date));
      }

      const weekResults = await Promise.all(weekPromises);
      setWeekData(weekResults);
    } catch (error) {
      console.error('Error fetching week schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDayAttendance = async (date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await api.get(`/attendance/my?startDate=${dateStr}&endDate=${dateStr}`);
      const attendanceData = response.data?.attendances || [];
      
      const attendance = attendanceData[0];
      const isToday = date.toDateString() === new Date().toDateString();
      
      return {
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday,
        hasAttendance: !!attendance,
        status: attendance?.status || 'ABSENT',
        checkIn: attendance?.checkIn,
        checkOut: attendance?.checkOut,
        totalHours: attendance?.totalWorkHours || 0,
        workMode: attendance?.user?.workMode || 'ONSITE',
        breakMinutes: attendance?.breakMinutes || 0
      };
    } catch (error) {
      console.log(`Failed to fetch attendance for ${date.toDateString()}:`, error);
      // Return default data on error
      return {
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === new Date().toDateString(),
        hasAttendance: false,
        status: 'ABSENT',
        checkIn: null,
        checkOut: null,
        totalHours: 0,
        workMode: 'ONSITE',
        breakMinutes: 0
      };
    }
  };

  const getStatusColor = (status, hasAttendance) => {
    if (!hasAttendance) return '#e0e0e0';
    switch (status) {
      case 'PRESENT': return '#4CAF50';
      case 'ABSENT': return '#f44336';
      case 'HALFDAY': return '#FF9800';
      case 'LATE': return '#FF9800';
      default: return '#e0e0e0';
    }
  };

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatTime = (time) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (loading) {
    return (
      <div className="dashboard-card">
        <h3>Work Schedule</h3>
        <div className="loading-placeholder">Loading schedule...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-card work-schedule-widget">
      <div className="widget-header">
        <h3>Work Schedule</h3>
        <span className="shift-timing">09:00 AM – 06:45 PM</span>
      </div>
      
      <div className="week-timeline">
        <div className="week-days">
          {weekData.map((day, index) => (
            <div 
              key={index} 
              className={`day-item ${day.isToday ? 'today' : ''}`}
            >
              <div className="day-header">
                <span className="day-name">{day.dayName}</span>
                <span className="day-number">{day.dayNumber}</span>
              </div>
              
              <div className="attendance-indicator">
                <div 
                  className="status-dot"
                  style={{ backgroundColor: getStatusColor(day.status, day.hasAttendance) }}
                />
                {day.isToday && <div className="today-indicator" />}
              </div>
              
              <div className="work-mode">
                {day.hasAttendance && (
                  <span className={`mode-badge ${day.workMode.toLowerCase()}`}>
                    {day.workMode === 'REMOTE' ? 'Remote' : 'On-site'}
                  </span>
                )}
              </div>
              
              <div className="hours-display">
                {day.hasAttendance ? (
                  <div className="hours-info">
                    <span className="total-hours">{formatHours(day.totalHours)}</span>
                    {day.checkIn && (
                      <span className="time-range">
                        {formatTime(day.checkIn)} - {day.checkOut ? formatTime(day.checkOut) : '...'}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="no-hours">-</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="week-summary">
        <div className="summary-item">
          <span className="label">Total Hours:</span>
          <span className="value">
            {formatHours(weekData.reduce((sum, day) => sum + day.totalHours, 0))}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Days Present:</span>
          <span className="value">
            {weekData.filter(day => day.hasAttendance && day.status === 'PRESENT').length}/7
          </span>
        </div>
      </div>
    </div>
  );
}

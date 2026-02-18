import { useState, useEffect } from 'react';
import holidaysData from '../holidays.json';

export default function UpcomingHolidaysWidget() {
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);

  useEffect(() => {
    const upcoming = getUpcomingHolidays();
    setUpcomingHolidays(upcoming);
  }, []);

  const getUpcomingHolidays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = holidaysData
      .map(holiday => ({
        ...holiday,
        holidayDate: new Date(holiday.date)
      }))
      .filter(holiday => holiday.holidayDate >= today)
      .sort((a, b) => a.holidayDate - b.holidayDate)
      .slice(0, 3);
    
    return upcoming;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilHoliday = (holidayDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = holidayDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getHolidayTypeColor = (name) => {
    const majorHolidays = ['Republic Day', 'Independence Day', 'Christmas Day', 'Diwali'];
    if (majorHolidays.includes(name)) return '#f44336';
    return '#FF9800';
  };

  if (upcomingHolidays.length === 0) {
    return (
      <div className="dashboard-card upcoming-holidays-widget">
        <h3>Upcoming Holidays</h3>
        <div className="no-holidays">
          <p>No upcoming holidays</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card upcoming-holidays-widget">
      <h3>Upcoming Holidays</h3>
      
      <div className="holidays-list">
        {upcomingHolidays.map((holiday) => (
          <div key={holiday.id} className="holiday-item">
            <div className="holiday-date">
              <div 
                className="date-indicator"
                style={{ backgroundColor: getHolidayTypeColor(holiday.name) }}
              >
                <span className="date-day">{holiday.holidayDate.getDate()}</span>
                <span className="date-month">
                  {holiday.holidayDate.toLocaleDateString('en-US', { month: 'short' })}
                </span>
              </div>
            </div>
            
            <div className="holiday-details">
              <h4 className="holiday-name">{holiday.name}</h4>
              <div className="holiday-info">
                <span className="holiday-day">{holiday.day}</span>
                <span className="holiday-countdown">
                  {getDaysUntilHoliday(holiday.holidayDate)}
                </span>
              </div>
            </div>
            
            <div className="holiday-status">
              <div className="status-badge">
                {getDaysUntilHoliday(holiday.holidayDate)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="holidays-footer">
        <small>
          {holidaysData.length} total holidays in {new Date().getFullYear()}
        </small>
      </div>
    </div>
  );
}

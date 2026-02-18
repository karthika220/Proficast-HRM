import { useState, useEffect } from 'react';

export default function UpcomingWeeklyLeave() {
  const [upcomingSundays, setUpcomingSundays] = useState([]);

  useEffect(() => {
    calculateUpcomingSundays();
  }, []);

  const calculateUpcomingSundays = () => {
    const sundays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextSunday = new Date(today);
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    
    for (let i = 0; i < 3; i++) {
      const sunday = new Date(nextSunday);
      sunday.setDate(nextSunday.getDate() + (i * 7));
      sundays.push(sunday);
    }
    
    setUpcomingSundays(sundays);
  };

  const formatDate = (date) => {
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  return (
    <div className="card" style={{ 
      background: 'white',
      color: '#1f2937',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌴</span>
          Upcoming Leave
        </h4>
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: '500',
          color: '#6b7280'
        }}>
          Weekly Off
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {upcomingSundays.map((sunday, index) => (
          <div 
            key={index} 
            style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              border: '1px solid #e2e8f0'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'white',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: '600',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '700', lineHeight: '1', color: '#1f2937' }}>
                {sunday.getDate()}
              </div>
              <div style={{ fontSize: '8px', textTransform: 'uppercase' }}>
                {sunday.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '2px',
                color: '#1f2937'
              }}>
                {formatDate(sunday)}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>📅</span>
                {getDaysUntil(sunday)}
              </div>
            </div>
            
            <div style={{
              fontSize: '16px',
              color: '#6b7280'
            }}>
              {index === 0 && getDaysUntil(sunday) === 'Today' ? '🎉' : '🌴'}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        marginTop: '16px', 
        paddingTop: '12px', 
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#6b7280'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>📋</span>
          <span>Regular weekly offs on Sundays</span>
        </div>
        <div style={{ 
          background: '#f3f4f6',
          borderRadius: '8px',
          padding: '2px 6px',
          fontWeight: '500'
        }}>
          {upcomingSundays.length} upcoming Sundays
        </div>
      </div>
    </div>
  );
}

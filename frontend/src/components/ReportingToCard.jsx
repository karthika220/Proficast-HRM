import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { UserContext } from '../context/UserContext';

export default function ReportingToCard() {
  const [reportingManager, setReportingManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(UserContext);

  useEffect(() => {
    fetchReportingManager();
  }, []);

  const fetchReportingManager = async () => {
    try {
      setLoading(true);
      
      const userData = user;
      
      if (!userData) {
        console.log('No user data available');
        setLoading(false);
        return;
      }
      
      if (userData.reportingManagerId) {
        try {
          const managerResponse = await api.get(`/employees/${userData.reportingManagerId}`);
          setReportingManager(managerResponse.data);
        } catch (error) {
          console.log('Manager not found, using fallback');
          const mappedManager = getMappedManager(userData);
          setReportingManager(mappedManager);
        }
      } else {
        const mappedManager = getMappedManager(userData);
        setReportingManager(mappedManager);
      }
    } catch (error) {
      console.error('Error fetching reporting manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMappedManager = (user) => {
    switch (user.role) {
      case 'MANAGER':
        return { fullName: 'Managing Director', role: 'MD' };
      case 'HR':
        return { fullName: 'Managing Director', role: 'MD' };
      case 'MD':
        return null;
      default:
        return null;
    }
  };

  const getDisplayManagerName = () => {
    if (!reportingManager) return 'Not Assigned';
    return reportingManager.fullName || reportingManager.name || 'Not Assigned';
  };

  if (loading) {
    return (
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>Reporting To</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>
                👤
              </div>
              <div>
                <div style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '8px', 
                  padding: '8px 16px',
                  fontSize: '14px'
                }}>
                  Loading...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)'
      }} />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>👥</span>
            Reporting To
          </h4>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {reportingManager ? '�' : '🎯'}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                marginBottom: '4px',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {getDisplayManagerName()}
              </div>
              
              {reportingManager && (
                <div style={{ fontSize: '13px', opacity: 0.9, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {reportingManager.designation && (
                    <span>{reportingManager.designation}</span>
                  )}
                  {reportingManager.employeeId && (
                    <span>ID: {reportingManager.employeeId}</span>
                  )}
                  {reportingManager.department && (
                    <span>{reportingManager.department}</span>
                  )}
                </div>
              )}
              
              {!reportingManager && (
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  {user?.role === 'MD' ? '🏆 Top Level Leadership' : '⚠️ Not Assigned'}
                </div>
              )}
            </div>
          </div>
          
          {reportingManager && reportingManager.email && (
            <button 
              onClick={() => window.open(`mailto:${reportingManager.email}`, '_blank')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'white',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              📧 Contact
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

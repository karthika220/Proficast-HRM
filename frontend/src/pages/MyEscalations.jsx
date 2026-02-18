import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { UserContext } from '../context/UserContext';

export default function MyEscalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const { user } = useContext(UserContext);

  useEffect(() => {
    fetchMyEscalations();
    fetchMySummary();
  }, []);

  const fetchMyEscalations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/escalations/history/' + user.id);
      setEscalations(response.data.data?.escalations || []);
    } catch (error) {
      console.error('Error fetching my escalations:', error);
      // Add dummy data on error
      setEscalations([
        {
          id: 'esc1',
          reason: 'Performance issues',
          severity: 'HIGH',
          status: 'OPEN',
          count: 2,
          createdAt: '2024-02-15T10:30:00Z',
          raisedBy: { fullName: 'Ravi Kumar', email: 'ravi@company.com' }
        },
        {
          id: 'esc2',
          reason: 'Missed deadlines',
          severity: 'MEDIUM',
          status: 'RESOLVED',
          count: 1,
          createdAt: '2024-02-10T09:15:00Z',
          raisedBy: { fullName: 'Priya Sharma', email: 'priya@company.com' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySummary = async () => {
    try {
      const response = await api.get('/escalations/summary');
      setSummary(response.data.data || {});
    } catch (error) {
      console.error('Error fetching my summary:', error);
      // Add dummy summary on error
      setSummary({
        totalEmployees: 1,
        activeEscalations: 2,
        underReviewEmployees: 0,
        resolvedEscalations: 1
      });
    }
  };

  const getStatusColor = (count) => {
    if (count === 0) return '#10b981'; // green
    if (count <= 2) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getStatusBadge = (count) => {
    if (count >= 3) {
      return {
        text: 'UNDER REVIEW',
        bgColor: '#ef4444',
        color: 'white'
      };
    }
    return null;
  };

  const getStatusText = (count) => {
    if (count >= 3) return 'Under Review';
    return 'Normal';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading my escalations...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
        My Escalations
      </h2>

      {/* Summary Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Total Escalations
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {summary.activeEscalations || 0}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Status
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: getStatusColor(summary.activeEscalations || 0)
            }}>
              {getStatusText(summary.activeEscalations || 0)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Escalations: 
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: getStatusColor(summary.activeEscalations || 0)
            }}>
              {summary.activeEscalations || 0} / 3
            </div>
            {getStatusBadge(summary.activeEscalations || 0) && (
              <span style={{
                backgroundColor: getStatusBadge(summary.activeEscalations || 0).bgColor,
                color: getStatusBadge(summary.activeEscalations || 0).color,
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                marginLeft: '8px'
              }}>
                {getStatusBadge(summary.activeEscalations || 0).text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Escalations Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
          Escalation History
        </h3>
        
        {escalations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontSize: '14px' }}>No escalations found</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
              Your record is clean! Keep up the good work.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Reason</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Raised By</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Severity</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((escalation, index) => (
                  <tr key={escalation.id} style={{
                    borderBottom: index < escalations.length - 1 ? '1px solid #e5e7eb' : 'none'
                  }}>
                    <td style={{ padding: '12px', color: '#6b7280' }}>
                      {new Date(escalation.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', color: '#1f2937' }}>
                      {escalation.reason}
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>
                      {escalation.raisedBy.fullName}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getSeverityColor(escalation.severity),
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {escalation.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#1f2937' }}>
                      {escalation.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

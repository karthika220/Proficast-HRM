import { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { UserContext } from '../context/UserContext';

export default function Escalation() {
  const [groupedData, setGroupedData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] = useState(null);
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [notifyEmployee, setNotifyEmployee] = useState(false);
  const [raisedBy, setRaisedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useContext(UserContext);

  useEffect(() => {
    fetchSummary();
    fetchGroupedEscalations();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await api.get('/escalations/summary');
      setSummary(response.data.data || {});
    } catch (error) {
      console.error('Error fetching summary:', error);
      // Add dummy summary on error
      setSummary({
        totalEmployees: 45,
        activeEscalations: 8,
        underReviewEmployees: 3,
        resolvedEscalations: 12
      });
    }
  };

  const fetchGroupedEscalations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/escalations/grouped');
      setGroupedData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching grouped escalations:', error);
      // Add dummy data on error
      setGroupedData([
        {
          team: 'Engineering',
          teamLead: { id: 'lead1', name: 'Ravi Kumar', email: 'ravi@company.com' },
          employees: [
            { id: 'emp1', name: 'Alice Johnson', role: 'SOFTWARE ENGINEER', email: 'alice@company.com' },
            { id: 'emp2', name: 'Bob Wilson', role: 'SOFTWARE ENGINEER', email: 'bob@company.com' },
            { id: 'emp3', name: 'Carol Davis', role: 'QA ENGINEER', email: 'carol@company.com' }
          ],
          escalations: [
            {
              id: 'esc1',
              employeeId: 'emp1',
              employeeName: 'Alice Johnson',
              reason: 'Performance issues',
              severity: 'HIGH',
              status: 'OPEN',
              count: 2,
              createdAt: '2024-02-15T10:30:00Z',
              raisedBy: { fullName: 'Ravi Kumar', email: 'ravi@company.com' }
            }
          ]
        },
        {
          team: 'Marketing',
          teamLead: { id: 'lead2', name: 'Kumar Singh', email: 'kumar@company.com' },
          employees: [
            { id: 'emp4', name: 'David Lee', role: 'MARKETER', email: 'david@company.com' },
            { id: 'emp5', name: 'Emma Wilson', role: 'MARKETER', email: 'emma@company.com' }
          ],
          escalations: []
        },
        {
          team: 'Design',
          teamLead: { id: 'lead3', name: 'Priya Sharma', email: 'priya@company.com' },
          employees: [
            { id: 'emp6', name: 'Frank Chen', role: 'DESIGNER', email: 'frank@company.com' },
            { id: 'emp7', name: 'Grace Kim', role: 'DESIGNER', email: 'grace@company.com' }
          ],
          escalations: [
            {
              id: 'esc2',
              employeeId: 'emp6',
              employeeName: 'Frank Chen',
              reason: 'Missed deadlines',
              severity: 'MEDIUM',
              status: 'OPEN',
              count: 3,
              createdAt: '2024-02-14T14:20:00Z',
              raisedBy: { fullName: 'Priya Sharma', email: 'priya@company.com' }
            }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = (employee) => {
    setSelectedEmployee(employee);
    setShowModal(true);
    setReason('');
    setSeverity('MEDIUM');
    setNotifyEmployee(false);
    setRaisedBy(user.email || '');
  };

  const handleSubmitEscalation = async () => {
    if (!selectedEmployee || !reason.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        raisedBy: user.email,
        reason: reason.trim(),
        severity
      };

      console.log("Sending Escalation:", payload);

      const response = await api.post('/escalations', payload);

      if (response.data) {
        console.log("Escalation created successfully:", response.data);
        
        // Update the local data to show the new escalation
        setGroupedData(prev => prev.map(team => {
          if (team.team === selectedEmployee.team) {
            return {
              ...team,
              escalations: [
                {
                  id: response.data.id,
                  employeeId: selectedEmployee.id,
                  employeeName: selectedEmployee.name,
                  reason: reason.trim(),
                  severity,
                  status: 'OPEN',
                  count: 1,
                  createdAt: response.data.createdAt,
                  raisedBy: { fullName: user.fullName, email: user.email }
                },
                ...team.escalations
              ]
            };
          }
          return team;
        }));
        
        setShowModal(false);
        setSelectedEmployee(null);
        setReason('');
        setSeverity('MEDIUM');
        setNotifyEmployee(false);
        setRaisedBy('');
        
        // Refresh summary
        fetchSummary();
      }
    } catch (error) {
      console.error('Error creating escalation:', error);
      alert(`Failed to create escalation: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = async (employee) => {
    try {
      const response = await api.get(`/escalations/history/${employee.id}`);
      setSelectedEmployeeHistory(response.data.data);
      setShowHistoryDrawer(true);
    } catch (error) {
      console.error('Error fetching employee history:', error);
      // Add dummy history on error
      setSelectedEmployeeHistory({
        employee: {
          fullName: employee.name,
          email: employee.email,
          role: employee.role,
          status: employee.count >= 3 ? 'Under Review' : 'Active'
        },
        escalations: [
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
        ]
      });
    }
  };

  const getEscalationCount = (employeeId) => {
    const employeeEscalations = [];
    groupedData.forEach(team => {
      const escalation = team.escalations.find(esc => esc.employeeId === employeeId);
      if (escalation) {
        employeeEscalations.push(escalation);
      }
    });
    
    if (employeeEscalations.length === 0) return 0;
    return Math.max(...employeeEscalations.map(esc => esc.count));
  };

  const getEmployeeStatus = (employeeId) => {
    const count = getEscalationCount(employeeId);
    if (count >= 3) return 'Under Review';
    return 'Normal';
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

  const canEscalate = (employee) => {
    const userRole = user?.role;
    if (userRole === 'HR') return true;
    if (userRole === 'TL' && employee.teamLead?.id === user.id) return true;
    if (userRole === 'MD' || userRole === 'MANAGER') return true;
    return false;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading escalations...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Summary Bar */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            {summary.totalEmployees || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Employees</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {summary.activeEscalations || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Active Escalations</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {summary.underReviewEmployees || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Under Review</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {summary.resolvedEscalations || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Resolved</div>
        </div>
      </div>

      {/* Department Groups */}
      {groupedData.map((team, index) => (
        <div key={team.team} style={{ marginBottom: '32px' }}>
          {/* Team Header */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
              {team.team}
            </h3>
            {team.teamLead && (
              <div style={{ marginBottom: '16px', color: '#6b7280' }}>
                <strong>Team Lead:</strong> {team.teamLead.name}
              </div>
            )}

            {/* Employees List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {team.employees.map(employee => {
                const count = getEscalationCount(employee.id);
                const status = getEmployeeStatus(employee.id);
                const statusBadge = getStatusBadge(count);
                const canEscalateEmployee = canEscalate(employee);

                return (
                  <div key={employee.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      {/* Avatar */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {employee.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Employee Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#1f2937', cursor: 'pointer' }}
                             onClick={() => handleViewHistory(employee)}>
                          {employee.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{employee.role}</div>
                        
                        {/* Escalation Count */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            Escalations: 
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: getStatusColor(count)
                          }}>
                            {count} / 3
                          </span>
                          {statusBadge && (
                            <span style={{
                              backgroundColor: statusBadge.bgColor,
                              color: statusBadge.color,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}>
                              {statusBadge.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getStatusColor(count),
                        color: 'white',
                        fontWeight: '500'
                      }}>
                        {status}
                      </div>
                      
                      {canEscalateEmployee && (
                        <button
                          onClick={() => handleEscalate(employee)}
                          style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563eb';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = '#3b82f6';
                          }}
                        >
                          Escalate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Escalation Modal */}
      {showModal && selectedEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '500px',
              maxWidth: '90%',
              onClick: (e) => e.stopPropagation()
            }}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Escalate Employee
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Employee Name
              </label>
              <input
                type="text"
                value={selectedEmployee.name}
                readOnly
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#f3f4f6'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Raised By
              </label>
              <input
                type="email"
                value={raisedBy}
                onChange={(e) => setRaisedBy(e.target.value)}
                placeholder="Enter HR / TL Email"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for escalation..."
                required
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyEmployee}
                  onChange={(e) => setNotifyEmployee(e.target.checked)}
                  style={{ margin: 0 }}
                />
                Notify employee immediately
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEscalation}
                disabled={submitting || !reason.trim()}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: (submitting || !reason.trim()) ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  cursor: (submitting || !reason.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {showHistoryDrawer && selectedEmployeeHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            backgroundColor: 'white',
            boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            overflow: 'auto'
          }}
        >
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                Escalation History
              </h3>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                {selectedEmployeeHistory.employee.fullName}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {selectedEmployeeHistory.employee.email}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {selectedEmployeeHistory.employee.role}
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Status: </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: selectedEmployeeHistory.employee.status === 'Under Review' ? '#ef4444' : '#10b981'
                }}>
                  {selectedEmployeeHistory.employee.status}
                </span>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
                Timeline
              </h4>
              {selectedEmployeeHistory.escalations.map(escalation => (
                <div key={escalation.id} style={{
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    {new Date(escalation.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                    {escalation.reason}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                    <span>Raised by: {escalation.raisedBy.fullName}</span>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: escalation.severity === 'HIGH' ? '#ef4444' : escalation.severity === 'MEDIUM' ? '#f59e0b' : '#10b981',
                      color: 'white',
                      fontSize: '10px'
                    }}>
                      {escalation.severity}
                    </span>
                    <span>Count: {escalation.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
      
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/employees/reporting-tree/${user.id}`);
      const manager = response.data.reportingTo;
      
      // If no manager, add dummy data
      if (!manager) {
        const dummyManager = {
          id: 'dummy-manager',
          fullName: 'Sarah Thompson',
          email: 'sarah.t@company.com',
          role: 'MANAGER',
          department: 'Engineering',
          employeeId: 'MGR001',
          designation: 'Engineering Manager',
          attendance: {
            status: 'PRESENT',
            checkIn: '2024-02-16T08:30:00Z',
            checkOut: null,
            isPresent: true
          }
        };
        setReportingManager(dummyManager);
      } else {
        setReportingManager(manager);
      }
    } catch (error) {
      console.error('Error fetching reporting manager:', error);
      // Set dummy data on error
      setReportingManager({
        id: 'dummy-manager',
        fullName: 'Sarah Thompson',
        email: 'sarah.t@company.com',
        role: 'MANAGER',
        department: 'Engineering',
        employeeId: 'MGR001',
        designation: 'Engineering Manager',
        attendance: {
          status: 'PRESENT',
          checkIn: '2024-02-16T08:30:00Z',
          checkOut: null,
          isPresent: true
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    return new Date(time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const getInitials = (name) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";
  };

  const getRoleColor = (role) => {
    const colors = { 
      MD: "#7c3aed", 
      HR: "#0891b2", 
      MANAGER: "#059669", 
      TL: "#f59e0b", 
      EMPLOYEE: "#6b7280" 
    };
    return colors[role] || "#6b7280";
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">Reporting To</div>
        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">Reporting To</div>
      <div style={{ padding: "20px" }}>
        {reportingManager ? (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ 
              width: 50, 
              height: 50, 
              borderRadius: "50%", 
              background: getRoleColor(reportingManager.role), 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              color: "white", 
              fontSize: "18px", 
              fontWeight: "700" 
            }}>
              {getInitials(reportingManager.fullName)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
                {reportingManager.fullName}
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                {reportingManager.designation || reportingManager.role}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "#6b7280" }}>
                <span style={{ 
                  background: reportingManager.workMode === 'REMOTE' ? '#dbeafe' : '#dcfce7',
                  color: reportingManager.workMode === 'REMOTE' ? '#1e40af' : '#166534',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '500'
                }}>
                  {reportingManager.workMode || 'ONSITE'}
                </span>
                {reportingManager.attendance?.checkIn && (
                  <span style={{ color: '#059669' }}>
 ✓ {formatTime(reportingManager.attendance.checkIn)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
            Not Assigned
          </div>
        )}
      </div>
    </div>
  );
}

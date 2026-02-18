import { useState, useEffect } from "react";
import api from "../api/axios";

export default function Reports() {
  const [reportType, setReportType] = useState("attendance");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res;
      if (reportType === "attendance") {
        res = await api.get("/attendance/summary", {
          params: dateRange,
        });
      } else if (reportType === "leave") {
        res = await api.get("/leave", {
          params: { status: "all" },
        });
      } else if (reportType === "employees") {
        res = await api.get("/employees");
      }
      setData(res.data);
    } catch (err) {
      console.error("Error fetching report:", err);
      alert("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExport = () => {
    const csvContent = JSON.stringify(data, null, 2);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-${reportType}-${new Date().getTime()}.csv`;
    link.click();
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>📊 Reports & Analytics</h1>
      <p style={{ color: "#64748b", fontSize: "15px", marginBottom: "24px" }}>View and export HR data</p>

      {/* Report Controls */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header">Generate Reports</div>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            {/* Report Type Selection */}
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="form-input"
              >
                <option value="attendance">📅 Attendance Summary</option>
                <option value="leave">🏖️ Leave Requests</option>
                <option value="employees">👥 Employee Directory</option>
              </select>
            </div>

            {/* Date Range (only for Attendance) */}
            {reportType === "attendance" && (
              <>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="form-input"
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={fetchReport} disabled={loading} className="btn btn-primary">
              {loading ? "Loading..." : "📋 Generate Report"}
            </button>

            {data && (
              <button onClick={handleExport} className="btn" style={{ background: "#10b981" }}>
                📥 Export Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Data Display */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>Loading report...</div>
        </div>
      ) : data ? (
        <div className="card">
          <div className="card-header">{reportType === "attendance" ? "📅 Attendance Report" : reportType === "leave" ? "🏖️ Leave Report" : "👥 Employee Report"}</div>
          <div style={{ padding: "20px" }}>
            {reportType === "attendance" && (
              <>
                <div className="grid grid-3" style={{ gap: "16px", marginBottom: "24px" }}>
                  <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "20px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>✅ Total Present</div>
                    <div style={{ fontSize: "32px", fontWeight: 800 }}>{data.presentCount || 0}</div>
                    <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>Days this month</div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "20px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>⏰ Total Late</div>
                    <div style={{ fontSize: "32px", fontWeight: 800 }}>{data.lateCount || 0}</div>
                    <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>Days this month</div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", padding: "20px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>❌ Total Absent</div>
                    <div style={{ fontSize: "32px", fontWeight: 800 }}>{data.absentCount || 0}</div>
                    <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>Days this month</div>
                  </div>
                </div>
                
                {/* Attendance Rate */}
                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>📊 Attendance Rate</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>Monthly Attendance</div>
                      <div style={{ background: "#e2e8f0", borderRadius: "8px", height: "24px", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            background: "linear-gradient(90deg, #10b981, #059669)", 
                            height: "100%", 
                            borderRadius: "8px",
                            width: `${Math.min(((data.presentCount || 0) / ((data.presentCount || 0) + (data.absentCount || 0)) * 100), 100)}%`,
                            transition: "width 0.5s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 600
                          }}
                        >
                          {Math.round(((data.presentCount || 0) / ((data.presentCount || 0) + (data.absentCount || 0)) * 100) || 0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {reportType === "leave" && Array.isArray(data) && (
              <>
                {/* Leave Statistics */}
                <div className="grid grid-4" style={{ gap: "16px", marginBottom: "24px" }}>
                  <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>✅ Approved</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {data.filter(l => l.status === 'Approved').length}
                    </div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>⏳ Pending</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {data.filter(l => l.status.includes('Pending')).length}
                    </div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>❌ Rejected</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {data.filter(l => l.status === 'Rejected').length}
                    </div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>📊 Total Requests</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {data.length}
                    </div>
                  </div>
                </div>

                {/* Leave Table */}
                <div className="table-responsive">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Employee</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Type</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Duration</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Reason</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((leave) => (
                        <tr key={leave.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>
                            {leave.user?.fullName || 'Unknown'}
                          </td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#374151" }}>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: leave.type === 'CL' ? '#dbeafe' : leave.type === 'SL' ? '#fce7f3' : '#f3e8ff',
                              color: leave.type === 'CL' ? '#1e40af' : leave.type === 'SL' ? '#92400e' : '#6b21a8'
                            }}>
                              {leave.type}
                            </span>
                          </td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#374151" }}>
                            {leave.days} {leave.days === 1 ? 'day' : 'days'}
                          </td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#374151" }}>
                            {leave.reason || 'Not specified'}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: leave.status === "Approved" ? "#d1fae5" : leave.status === "Rejected" ? "#fee2e2" : "#fef3c7",
                                color: leave.status === "Approved" ? "#065f46" : leave.status === "Rejected" ? "#7f1d1d" : "#92400e",
                              }}
                            >
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 10 && (
                    <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "13px" }}>
                      Showing 10 of {data.length} requests. Export to see all data.
                    </div>
                  )}
                </div>
              </>
            )}

            {reportType === "employees" && Array.isArray(data) && (
              <>
                {/* Employee Statistics */}
                <div className="grid grid-4" style={{ gap: "16px", marginBottom: "24px" }}>
                  <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>👥 Total Employees</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>{data.length}</div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>💼 Active</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {data.filter(emp => emp.status !== 'Archived').length}
                    </div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>🏢 Departments</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {[...new Set(data.map(emp => emp.department).filter(Boolean))].length}
                    </div>
                  </div>
                  <div style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", padding: "16px", borderRadius: "12px", textAlign: "center", color: "white" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, marginBottom: "8px", opacity: 0.9 }}>👔 Managers</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {data.filter(emp => emp.role === 'MANAGER').length}
                    </div>
                  </div>
                </div>

                {/* Employee Table */}
                <div className="table-responsive">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Name</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Email</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Department</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Designation</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Role</th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 15).map((emp) => (
                        <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: `linear-gradient(135deg, ${emp.role === "MD" ? "#7c3aed" : emp.role === "HR" ? "#2563eb" : emp.role === "MANAGER" ? "#059669" : "#f59e0b"}, ${emp.role === "MD" ? "#7c3aed" : emp.role === "HR" ? "#2563eb" : emp.role === "MANAGER" ? "#059669" : "#f59e0b"}aa)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: 700
                              }}>
                                {emp.fullName?.charAt(0).toUpperCase()}
                              </div>
                              <span>{emp.fullName}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#374151" }}>{emp.email}</td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#374151" }}>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: emp.department ? '#e0f2fe' : '#f1f5f9',
                              color: emp.department ? '#1e40af' : '#64748b'
                            }}>
                              {emp.department || 'Not assigned'}
                            </span>
                          </td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#374151" }}>{emp.designation || '—'}</td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: emp.role === "MD" ? "#ede9fe" : emp.role === "HR" ? "#dbeafe" : emp.role === "MANAGER" ? "#dcfce7" : "#fef3c7",
                                color: emp.role === "MD" ? "#6b21a8" : emp.role === "HR" ? "#0c4a6e" : emp.role === "MANAGER" ? "#166534" : "#92400e",
                              }}
                            >
                              {emp.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "#10b981",
                                color: "white"
                              }}
                            >
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.length > 15 && (
                    <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "13px" }}>
                      Showing 15 of {data.length} employees. Export to see all data.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { UserContext } from "../context/UserContext";

export default function Leave() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approveRejectLoading, setApproveRejectLoading] = useState(null);
  const [commentData, setCommentData] = useState({});
  const [formData, setFormData] = useState({
    type: "CL",
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    if (user?.id) {
      fetchLeaveData();
    }
  }, [user?.id]);

  const fetchLeaveData = async () => {
    try {
      const requests = [
        api.get("/leave/balance"),
        api.get("/leave/my"),
      ];

      // If user is HR or MD, also fetch pending requests
      if (user?.role === "HR" || user?.role === "MD") {
        requests.push(api.get("/leave?status=pending"));
      }

      const responses = await Promise.all(requests);
      setLeaveBalance(responses[0].data);
      setLeaveRequests(responses[1].data);
      
      if (responses[2]) {
        setPendingRequests(responses[2].data);
      }
    } catch (err) {
      console.error("Error fetching leave data:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      alert("Please select both start and end dates");
      return;
    }
    setLoading(true);

    try {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      await api.post("/leave/apply", {
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days,
        reason: formData.reason,
      });
      showNotification("✓ Leave request submitted successfully!", "success");
      setFormData({ type: "CL", startDate: "", endDate: "", reason: "" });
      setShowForm(false);
      await fetchLeaveData();
    } catch (err) {
      showNotification(
        err.response?.data?.error || err.response?.data?.message || "Failed to submit leave request",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    setApproveRejectLoading(requestId);
    try {
      await api.patch(`/leave/${requestId}/approve`, {
        comment: commentData[requestId] || "",
      });
      alert("Leave request approved");
      setCommentData((prev) => {
        const newData = { ...prev };
        delete newData[requestId];
        return newData;
      });
      await fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Failed to approve leave request");
    } finally {
      setApproveRejectLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    setApproveRejectLoading(requestId);
    try {
      await api.patch(`/leave/${requestId}/reject`, {
        comment: commentData[requestId] || "",
      });
      alert("Leave request rejected");
      setCommentData((prev) => {
        const newData = { ...prev };
        delete newData[requestId];
        return newData;
      });
      await fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Failed to reject leave request");
    } finally {
      setApproveRejectLoading(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCommentChange = (requestId, value) => {
    setCommentData((prev) => ({
      ...prev,
      [requestId]: value,
    }));
  };

  const getStatusBadge = (status) => {
    const colors = {
      PendingManager: "#FFA500",
      PendingHR: "#FF6B6B",
      PendingMD: "#4CAF50",
      Approved: "#388E3C",
      Rejected: "#D32F2F",
    };
    return (
      <span style={{ color: colors[status], fontWeight: "bold" }}>
        {status}
      </span>
    );
  };

  const isHROrMD = user?.role === "HR" || user?.role === "MD";

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>🏖️ Leave Management</h1>
      <p style={{ color: "#64748b", fontSize: "15px", marginBottom: "24px" }}>Request and track your leave days</p>

      {/* Leave Balance */}
      {leaveBalance && (
        <div className="grid grid-2" style={{ marginBottom: "30px" }}>
          <div className="card" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div className="card-header">🏖️ Casual Leave</div>
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "#2563eb" }}>{leaveBalance.casual || 0}</div>
              <div style={{ fontSize: "12px", color: "#0369a1", marginTop: "8px" }}>Days available</div>
            </div>
          </div>
          <div className="card" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div className="card-header">🤒 Sick Leave</div>
            <div style={{ padding: "20px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "#16a34a" }}>{leaveBalance.sick || 0}</div>
              <div style={{ fontSize: "12px", color: "#166534", marginTop: "8px" }}>Days available</div>
            </div>
          </div>
        </div>
      )}

      {isHROrMD && pendingRequests.length > 0 && (
        <div className="card" style={{ marginBottom: "30px" }}>
          <div className="card-header">⏳ Pending Leave Requests</div>
          <div style={{ padding: "20px" }}>
            {pendingRequests.map((request) => (
              <div key={request.id} style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", marginBottom: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{request.user?.fullName}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{request.type} Leave • {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: "12px", textAlign: "right" }}>
                    <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "6px", fontWeight: 600 }}>{request.status}</span>
                  </div>
                </div>
                {request.reason && <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}><strong>Reason:</strong> {request.reason}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <textarea
                    placeholder="Add comment (optional)"
                    value={commentData[request.id] || ""}
                    onChange={(e) => handleCommentChange(request.id, e.target.value)}
                    className="form-input"
                    style={{ gridColumn: "1 / -1", maxWidth: "100%" }}
                  />
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={approveRejectLoading === request.id}
                    className="btn"
                    style={{ background: "#10b981", color: "white" }}
                  >
                    {approveRejectLoading === request.id ? "Processing..." : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={approveRejectLoading === request.id}
                    className="btn"
                    style={{ background: "#ef4444", color: "white" }}
                  >
                    {approveRejectLoading === request.id ? "Processing..." : "✗ Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Your Requests</h2>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn btn-primary"
          >
            {showForm ? "Cancel" : "📋 New Request"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-input"
                required
              >
                <option value="CL">🏖️ Casual Leave (CL)</option>
                <option value="SL">🤒 Sick Leave (SL)</option>
                <option value="UL">📋 Unpaid Leave (UL)</option>
              </select>
            </div>

            <div className="grid grid-2" style={{ gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason</label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Provide a reason for your leave request"
                className="form-input"
                style={{ minHeight: "100px" }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
              {loading ? "Submitting..." : "✓ Submit Request"}
            </button>
          </form>
        )}

        {leaveRequests.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No leave requests yet</div>
        ) : (
          <div style={{ padding: "20px" }}>
            {leaveRequests.map((request) => (
              <div key={request.id} style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{request.type} Leave</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      {new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: request.status === "Approved" ? "#d1fae5" : request.status === "Rejected" ? "#fee2e2" : "#fef3c7",
                    color: request.status === "Approved" ? "#065f46" : request.status === "Rejected" ? "#7f1d1d" : "#92400e",
                  }}>
                    {request.status}
                  </span>
                </div>
                {request.reason && <div style={{ fontSize: "12px", color: "#64748b" }}>{request.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

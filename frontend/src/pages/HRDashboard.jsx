import { useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { UserContext } from "../context/UserContext";

export default function HRDashboard() {
  const { user } = useContext(UserContext);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [approveRejectLoading, setApproveRejectLoading] = useState(null);
  const [commentData, setCommentData] = useState({});

  useEffect(() => {
    if (user?.role === "HR" || user?.role === "MD") {
      fetchHRData();
    }
  }, [user?.role]);

  const fetchHRData = async () => {
    setLoading(true);
    try {
      const [leavesRes, statsRes, attendanceRes] = await Promise.all([
        api.get("/leave?status=PENDING"),
        api.get("/employees"),
        api.get("/dashboard/stats"),
      ]);

      setPendingLeaves(leavesRes.data);
      setEmployeeStats(statsRes.data);
      setAttendanceSummary(attendanceRes.data);
    } catch (err) {
      console.error("Error fetching HR dashboard data:", err);
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
      await fetchHRData();
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
      await fetchHRData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || "Failed to reject leave request");
    } finally {
      setApproveRejectLoading(null);
    }
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

  return (
    <div className="hr-dashboard">
      <h1>HR Dashboard</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <section className="hr-stats">
            <h2>Quick Stats</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Employees</h3>
                <p className="stat-number">
                  {employeeStats?.employees?.length || 0}
                </p>
              </div>
              <div className="stat-card">
                <h3>Pending Leave Requests</h3>
                <p className="stat-number">{pendingLeaves.length}</p>
              </div>
              {attendanceSummary && (
                <div className="stat-card">
                  <h3>Present Today</h3>
                  <p className="stat-number">{attendanceSummary.presentCount || 0}</p>
                </div>
              )}
            </div>
          </section>

          <section className="pending-leaves-section">
            <h2>Pending Leave Requests</h2>

            {pendingLeaves.length === 0 ? (
              <p>No pending leave requests</p>
            ) : (
              <div className="pending-leaves-list">
                {pendingLeaves.map((request) => (
                  <div key={request.id} className="leave-request-card">
                    <div className="request-header">
                      <h3>{request.user?.fullName}</h3>
                      <span className="badge">{request.type} Leave</span>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="request-details">
                      <p>
                        <strong>Period:</strong>{" "}
                        {new Date(request.startDate).toLocaleDateString()} -{" "}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      {request.reason && (
                        <p>
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                    </div>

                    <div className="request-actions">
                      <textarea
                        placeholder="Add comment (optional)"
                        value={commentData[request.id] || ""}
                        onChange={(e) =>
                          handleCommentChange(request.id, e.target.value)
                        }
                        rows="2"
                        className="comment-input"
                      />
                      <div className="action-buttons">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={approveRejectLoading === request.id}
                          className="btn-approve"
                        >
                          {approveRejectLoading === request.id
                            ? "Processing..."
                            : "Approve"}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={approveRejectLoading === request.id}
                          className="btn-reject"
                        >
                          {approveRejectLoading === request.id
                            ? "Processing..."
                            : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

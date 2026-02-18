import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api from "../api/axios";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useContext(UserContext);
  const [profileData, setProfileData] = useState({
    fullName: user?.name || user?.fullName || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await api.patch(`/employees/${user?.id}`, profileData);
      const updatedUser = response.data.employee;
      
      // Update user context with new data
      if (updatedUser) {
        updateUser(updatedUser);
        // Update local profile data state
        setProfileData({
          fullName: updatedUser.fullName || updatedUser.name || "",
          phone: updatedUser.phone || "",
          email: updatedUser.email || "",
        });
      }
      
      setMessageType("success");
      setMessage("✓ Profile updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.error || err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMessage("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessageType("error");
      setMessage("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessageType("success");
      setMessage("✓ Password updated successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessageType("error");
      setMessage(
        err.response?.data?.error || err.response?.data?.message || "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {message && (
        <div className={`notification ${messageType}`} style={{ marginBottom: "20px" }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>Settings & Profile</h1>
        <p style={{ color: "#64748b", fontSize: "15px" }}>Manage your account preferences and security</p>
      </div>

      <div className="grid grid-2" style={{ gap: "30px" }}>
        {/* Profile Information */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>👤</span>
            <span>Profile Information</span>
          </div>
          <form onSubmit={handleUpdateProfile} style={{ padding: "20px" }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={profileData.fullName}
                onChange={handleProfileChange}
                className="form-input"
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                disabled
                className="form-input"
                style={{ background: "#f3f4f6", cursor: "not-allowed" }}
              />
              <small style={{ color: "#94a3b8", fontSize: "12px" }}>Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={profileData.phone}
                onChange={handleProfileChange}
                className="form-input"
                placeholder="Enter your phone number"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
              {loading ? "Saving..." : "💾 Save Profile"}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🔒</span>
            <span>Change Password</span>
          </div>
          <form onSubmit={handleUpdatePassword} style={{ padding: "20px" }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Enter your current password"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Enter new password (min. 6 characters)"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Re-enter your new password"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
              {loading ? "Updating..." : "🔐 Update Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginTop: "30px" }}>
        <div className="card-header">Account Information</div>
        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: "4px" }}>Full Name</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{user?.fullName}</div>
          </div>
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: "4px" }}>Email</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{user?.email}</div>
          </div>
          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: "4px" }}>Role</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
              {user?.role === "MD" ? "Managing Director" : user?.role === "HR" ? "HR Manager" : user?.role === "MANAGER" ? "Manager" : "Employee"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useContext, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import api from "../api/axios";

export default function Profile() {
  const { user } = useContext(UserContext);
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        // If employeeId is provided, fetch that employee, otherwise fetch current user
        const targetId = employeeId || user?.id;
        if (!targetId) {
          setLoading(false);
          return;
        }

        const res = await api.get(`/employees/${targetId}`);
        setEmployee(res.data.employee);
        setFormData(res.data.employee);
      } catch (err) {
        console.error("Error fetching employee:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, user]);

  const handleEdit = () => {
    setEditMode(true);
    setMessage("");
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData(employee);
    setMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setMessage("");

    try {
      const response = await api.put(`/employees/${employee.id}`, formData);
      const updatedEmployee = response.data.employee;
      
      setEmployee(updatedEmployee);
      setFormData(updatedEmployee);
      setEditMode(false);
      
      setMessageType("success");
      setMessage("✓ Profile updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div>Loading profile...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div>Employee not found</div>
        <button 
          onClick={() => navigate(-1)}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const getWorkModeLabel = (mode) => {
    switch (mode) {
      case "REMOTE": return "Remote";
      case "CLIENT_OFFICE": return "Client Office";
      case "ONSITE": 
      default: return "On-site";
    }
  };

  const getWorkModeColor = (mode) => {
    switch (mode) {
      case "REMOTE": return "#e0f2fe";
      case "CLIENT_OFFICE": return "#fef3c7";
      case "ONSITE": 
      default: return "#f0fdf4";
    }
  };

  const getWorkModeTextColor = (mode) => {
    switch (mode) {
      case "REMOTE": return "#0369a1";
      case "CLIENT_OFFICE": return "#92400e";
      case "ONSITE": 
      default: return "#166534";
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: "30px" }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "20px"
          }}
        >
          ← Back
        </button>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Employee Profile
          </h1>
          
          {!editMode ? (
            <button
              onClick={handleEdit}
              style={{
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Edit Profile
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleCancel}
                disabled={saveLoading}
                style={{
                  padding: "8px 16px",
                  background: "#64748b",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: saveLoading ? "not-allowed" : "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveLoading}
                style={{
                  padding: "8px 16px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: saveLoading ? "not-allowed" : "pointer"
                }}
              >
                {saveLoading ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
        
        <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
          {employee.fullName || employee.name}
        </p>
        
        {message && (
          <div style={{
            marginTop: "12px",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            background: messageType === "success" ? "#f0fdf4" : "#fef2f2",
            color: messageType === "success" ? "#166534" : "#dc2626",
            border: `1px solid ${messageType === "success" ? "#bbf7d0" : "#fecaca"}`
          }}>
            {message}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ padding: "40px" }}>
          {/* Profile Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "30px", marginBottom: "40px" }}>
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "36px",
                fontWeight: 800,
              }}
            >
              {employee.fullName?.charAt(0).toUpperCase()}
            </div>
            
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                {employee.fullName}
              </h2>
              <p style={{ fontSize: "16px", color: "#64748b", margin: "0 0 12px 0" }}>
                {employee.designation || employee.role}
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    background: "#f1f5f9",
                    color: "#475569"
                  }}
                >
                  {employee.employeeId}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 12px",
                    borderRadius: "20px",
                    background: getWorkModeColor(employee.workMode),
                    color: getWorkModeTextColor(employee.workMode)
                  }}
                >
                  {getWorkModeLabel(employee.workMode)}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
            {/* Personal Information */}
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "20px" }}>
                Personal Information
              </h3>
              
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Full Name</div>
                {editMode ? (
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName || formData.name || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.fullName || employee.name}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Email</div>
                {editMode ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.email}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Phone</div>
                {editMode ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.phone || "Not provided"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Date of Birth</div>
                {editMode ? (
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.dob ? new Date(employee.dob).toLocaleDateString() : "Not provided"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Gender</div>
                {editMode ? (
                  <select
                    name="gender"
                    value={formData.gender || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.gender || "Not specified"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Marital Status</div>
                {editMode ? (
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.maritalStatus || "Not specified"}
                  </div>
                )}
              </div>
            </div>

            {/* Employment Information */}
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "20px" }}>
                Employment Information
              </h3>
              
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Department</div>
                {editMode ? (
                  <input
                    type="text"
                    name="department"
                    value={formData.department || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.department || "Not assigned"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Designation</div>
                {editMode ? (
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.designation || "Not assigned"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Work Mode</div>
                {editMode ? (
                  <select
                    name="workMode"
                    value={formData.workMode || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  >
                    <option value="ONSITE">On-site</option>
                    <option value="REMOTE">Remote</option>
                    <option value="CLIENT_OFFICE">Client Office</option>
                  </select>
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {getWorkModeLabel(employee.workMode)}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Reporting Manager</div>
                {editMode ? (
                  <input
                    type="text"
                    name="reportingManagerId"
                    value={formData.reportingManagerId || formData.reportingTo || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.reportingManager?.fullName || "Not assigned"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Date of Joining</div>
                {editMode ? (
                  <input
                    type="date"
                    name="dateOfJoining"
                    value={formData.dateOfJoining ? new Date(formData.dateOfJoining).toISOString().split('T')[0] : ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.dateOfJoining ? 
                      new Date(employee.dateOfJoining).toLocaleDateString() : 
                      "Not specified"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Date of Exit</div>
                {editMode ? (
                  <input
                    type="date"
                    name="dateOfExit"
                    value={formData.dateOfExit ? new Date(formData.dateOfExit).toISOString().split('T')[0] : ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.dateOfExit ? 
                      new Date(employee.dateOfExit).toLocaleDateString() : 
                      "Not applicable"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Status</div>
                {editMode ? (
                  <select
                    name="status"
                    value={formData.status || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                    {employee.status || "Active"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div style={{ marginTop: "30px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "20px" }}>
              Address Information
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Current Address</div>
                {editMode ? (
                  <textarea
                    name="currentAddress"
                    value={formData.currentAddress || ""}
                    onChange={handleInputChange}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a",
                      resize: "vertical"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", whiteSpace: "pre-wrap" }}>
                    {employee.currentAddress || "Not provided"}
                  </div>
                )}
              </div>
              
              <div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Permanent Address</div>
                {editMode ? (
                  <textarea
                    name="permanentAddress"
                    value={formData.permanentAddress || ""}
                    onChange={handleInputChange}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a",
                      resize: "vertical"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", whiteSpace: "pre-wrap" }}>
                    {employee.permanentAddress || "Not provided"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Experience Information */}
          <div style={{ marginTop: "30px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "20px" }}>
              Experience Information
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>
                  Current Experience
                </h4>
                
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Company Name</div>
                  {editMode ? (
                    <input
                      type="text"
                      name="currentCompanyName"
                      value={formData.currentCompanyName || ""}
                      onChange={handleInputChange}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#0f172a"
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                      {employee.currentCompanyName || "Not provided"}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Years of Experience</div>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.1"
                      name="currentYearsExp"
                      value={formData.currentYearsExp || ""}
                      onChange={handleInputChange}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#0f172a"
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                      {employee.currentYearsExp ? `${employee.currentYearsExp} years` : "Not provided"}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>
                  Previous Experience
                </h4>
                
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Company Name</div>
                  {editMode ? (
                    <input
                      type="text"
                      name="previousCompanyName"
                      value={formData.previousCompanyName || ""}
                      onChange={handleInputChange}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#0f172a"
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                      {employee.previousCompanyName || "Not provided"}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Years of Experience</div>
                  {editMode ? (
                    <input
                      type="number"
                      step="0.1"
                      name="previousYearsExp"
                      value={formData.previousYearsExp || ""}
                      onChange={handleInputChange}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#0f172a"
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                      {employee.previousYearsExp ? `${employee.previousYearsExp} years` : "Not provided"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div style={{ marginTop: "30px", paddingTop: "30px", borderTop: "1px solid #e2e8f0" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "20px" }}>
              System Information
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Role</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  {employee.role === "MD" ? "Managing Director" : 
                   employee.role === "HR" ? "HR Manager" : 
                   employee.role === "MANAGER" ? "Manager" : "Employee"}
                </div>
              </div>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Status</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  {employee.status || "Active"}
                </div>
              </div>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Created At</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  {employee.createdAt ? 
                    new Date(employee.createdAt).toLocaleDateString() : 
                    "Not specified"}
                </div>
              </div>
            </div>
            
            {employee.createdBy && (
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Created By</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                  {employee.createdBy}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

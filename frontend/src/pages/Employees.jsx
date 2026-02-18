import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { UserContext } from "../context/UserContext";
import EmployeeActivity from "../components/EmployeeActivity";

const tierColor = (role) => {
  const colors = { MD: "#7c3aed", HR: "#2563eb", MANAGER: "#059669", EMPLOYEE: "#f59e0b" };
  return colors[role] || "#64748b";
};

const roleColor = (role) => {
  const colors = { MD: "#7c3aed", HR: "#2563eb", MANAGER: "#059669", EMPLOYEE: "#f59e0b" };
  return colors[role] || "#64748b";
};

const roleLabel = (role) => {
  const labels = { MD: "Managing Director", HR: "HR Manager", MANAGER: "Manager", EMPLOYEE: "Employee" };
  return labels[role] || role;
};

const tierLabel = (role) => {
  switch (role) {
    case "MD":
      return "Managing Director";
    case "HR":
      return "HR Manager";
    case "MANAGER":
      return "Manager";
    case "EMPLOYEE":
      return "Employee";
    default:
      return role;
  }
};

export default function Employees() {
  const { user, updateUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [showActivity, setShowActivity] = useState(false);
  const [selectedEmployeeForActivity, setSelectedEmployeeForActivity] = useState(null);
  
  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    designation: "",
    role: "EMPLOYEE",
    workMode: "ONSITE",
    reportingManagerId: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees");
      setEmployees(res.data.employees || res.data);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.employeeId || !formData.fullName || !formData.email || !formData.password) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    
    if (formData.employeeId.includes("@")) {
      alert("Employee ID should not be an email address. Use format like: EMP001");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      await api.post("/employees", formData);
      showNotification("Employee added successfully!");
      setFormData({
        employeeId: "",
        fullName: "",
        email: "",
        password: "",
        phone: "",
        department: "",
        designation: "",
        role: "EMPLOYEE",
      });
      setShowForm(false);
      await fetchEmployees();
    } catch (err) {
      console.error('Add employee error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Failed to add employee";
      alert(errorMsg);
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleEditEmployee = () => {
    setEditFormData({
      fullName: selectedEmployee.fullName,
      phone: selectedEmployee.phone || "",
      department: selectedEmployee.department || "",
      designation: selectedEmployee.designation || "",
      role: selectedEmployee.role,
      status: selectedEmployee.status || "Active",
      workMode: selectedEmployee.workMode || "ONSITE",
      reportingTo: selectedEmployee.reportingManagerId || "",
    });
    setEditMode(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveEmployee = async () => {
    try {
      await api.patch(`/employees/${selectedEmployee.id}`, editFormData);
      showNotification("Employee saved successfully!");
      setEditMode(false);
      const updatedEmployee = { ...selectedEmployee, ...editFormData };
      setSelectedEmployee(updatedEmployee);
      
      // Update logged-in user data if they are the one being edited
      if (user?.id === selectedEmployee.id) {
        updateUser(updatedEmployee);
      }
      
      await fetchEmployees();
    } catch (err) {
      console.error('Update employee error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Failed to update employee";
      alert(errorMsg);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditFormData({});
  };

  const canAddEmployee = user?.role === "HR" || user?.role === "MD";
  
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || emp.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#10b981",
            color: "white",
            padding: "14px 20px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 100,
            animation: "slideIn 0.3s ease",
          }}
        >
          ✓ {notification}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0 }}>Employees</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0, marginTop: 4 }}>{filteredEmployees.length} total</p>
        </div>
        {canAddEmployee && (
          <button
            onClick={() => setShowForm(!showForm)}
            className={showForm ? "btn" : "btn btn-primary"}
            style={{
              padding: "10px 20px",
            }}
          >
            {showForm ? "Cancel" : "👥 Add Employee"}
          </button>
        )}
      </div>

      {/* Add Employee Form */}
      {showForm && canAddEmployee && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 0, marginBottom: 16 }}>
            Add New Employee
          </h2>
          <form onSubmit={handleAddEmployee}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              {[
                { name: "employeeId", label: "Employee ID", type: "text", required: true, placeholder: "e.g., EMP001" },
                { name: "fullName", label: "Full Name", type: "text", required: true, placeholder: "e.g., John Doe" },
                { name: "email", label: "Email", type: "email", required: true, placeholder: "e.g., john@company.com" },
                { name: "password", label: "Password", type: "password", required: true, placeholder: "Minimum 6 characters" },
                { name: "phone", label: "Phone", type: "tel", placeholder: "e.g., +1234567890" },
                { name: "department", label: "Department", type: "select", options: ["Video Editor", "Graphic", "Operation & Support", "Performance Marketing", "SMM", "GMB", "Development"] },
                { name: "designation", label: "Designation", type: "select", options: ["Junior", "Junior Web Developer", "Managing Director", "HR & Manager", "Head of Operation", "Operation & Client Satisfaction", "GMB Lead", "Video Editor", "Video Editors Lead", "Graphic Design Lead", "Junior Graphic Designer", "SMM (Social Media Marketer)", "Performance Marketer & Lead"] },
                { name: "workMode", label: "Work Mode", type: "select", options: ["ONSITE", "REMOTE", "CLIENT_OFFICE"] },
                { name: "reportingManagerId", label: "Reporting To", type: "select", options: employees.map(emp => ({ value: emp.id, label: emp.fullName })) },
              ].map((field) => (
                <div key={field.name}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                    {field.label} {field.required && <span style={{ color: "#dc2626" }}>*</span>}
                  </label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      required={field.required}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">{`Select ${field.label}`}</option>
                      {field.options.map((option) => (
                        <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
                          {typeof option === "string" ? option : option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      required={field.required}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 13,
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                    />
                  )}
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Role <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR">HR Manager</option>
                  <option value="MD">Managing Director</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                style={{
                  padding: "10px 24px",
                  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add Employee
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    employeeId: "",
                    fullName: "",
                    email: "",
                    password: "",
                    phone: "",
                    department: "",
                    designation: "",
                    role: "EMPLOYEE",
                  });
                }}
                style={{
                  padding: "10px 24px",
                  background: "#e2e8f0",
                  color: "#374151",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{
            padding: "10px 14px",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 13,
            minWidth: 140,
          }}
        >
          <option value="all">All Roles</option>
          <option value="MD">Managing Director</option>
          <option value="HR">HR Manager</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>

      {/* Employees Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Loading employees...</div>
      ) : filteredEmployees.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>No employees found</div>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Employee", "Department", "Role", "Email", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 20px",
                      textAlign: "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, idx) => (
                <tr
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setModalOpen(true);
                  }}
                  style={{
                    borderBottom: idx !== filteredEmployees.length - 1 ? "1px solid #f1f5f9" : "none",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafbff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${tierColor(emp.role)}88, ${tierColor(emp.role)})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {emp.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{emp.fullName}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{emp.designation || "N/A"}</span>
                          {emp.workMode && (
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: "10px",
                                fontSize: "10px",
                                fontWeight: 600,
                                background: emp.workMode === "REMOTE" ? "#e0f2fe" : 
                                           emp.workMode === "CLIENT_OFFICE" ? "#fef3c7" : "#f0fdf4",
                                color: emp.workMode === "REMOTE" ? "#0369a1" : 
                                       emp.workMode === "CLIENT_OFFICE" ? "#92400e" : "#166534"
                              }}
                            >
                              {emp.workMode === "REMOTE" ? "Remote" : 
                               emp.workMode === "CLIENT_OFFICE" ? "Client" : "On-site"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#374151" }}>
                    {emp.department || "—"}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: tierColor(emp.role) + "18",
                        color: tierColor(emp.role),
                      }}
                    >
                      {tierLabel(emp.role)}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "#64748b", padding: "14px 20px" }}>{emp.email}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 12px",
                        borderRadius: 20,
                        background: emp.status === "Active" ? "#d1fae5" : 
                                   emp.status === "Resigned" ? "#fef3c7" : 
                                   emp.status === "Terminated" ? "#fee2e2" : "#f0fdf4",
                        color: emp.status === "Active" ? "#065f46" : 
                               emp.status === "Resigned" ? "#92400e" : 
                               emp.status === "Terminated" ? "#7f1d1d" : "#16a34a",
                      }}
                    >
                      {emp.status || "Active"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${emp.id}`);
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "#64748b",
                          cursor: "pointer",
                          textDecoration: "none"
                        }}
                      >
                        View Profile
                      </button>
                      {(user.role === "HR" || user.role === "MD" || user.role === "MANAGER") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmployeeForActivity(emp.id);
                            setShowActivity(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#dbeafe",
                            border: "1px solid #93c5fd",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#1d4ed8",
                            cursor: "pointer"
                          }}
                        >
                          View Activity
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Detail Modal */}
      {modalOpen && selectedEmployee && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => {
            if (!editMode) setModalOpen(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              width: 520,
              padding: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${tierColor(selectedEmployee.role)}, ${tierColor(selectedEmployee.role)}aa)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {selectedEmployee.fullName?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {editMode ? (
                    <input
                      type="text"
                      name="fullName"
                      value={editFormData.fullName}
                      onChange={handleEditFormChange}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        padding: "6px 10px",
                        fontSize: 18,
                        fontWeight: 800,
                        width: "100%",
                        boxSizing: "border-box"
                      }}
                    />
                  ) : (
                    selectedEmployee.fullName
                  )}
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0" }}>
                  {editMode ? (
                    <select
                      name="designation"
                      value={editFormData.designation}
                      onChange={handleEditFormChange}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 13,
                        width: "100%",
                        boxSizing: "border-box"
                      }}
                    >
                      <option value="">Select Designation</option>
                      <option value="Junior">Junior</option>
                      <option value="Junior Web Developer">Junior Web Developer</option>
                      <option value="Managing Director">Managing Director</option>
                      <option value="HR & Manager">HR & Manager</option>
                      <option value="Head of Operation">Head of Operation</option>
                      <option value="Operation & Client Satisfaction">Operation & Client Satisfaction</option>
                      <option value="GMB Lead">GMB Lead</option>
                      <option value="Video Editor">Video Editor</option>
                      <option value="Video Editors Lead">Video Editors Lead</option>
                      <option value="Graphic Design Lead">Graphic Design Lead</option>
                      <option value="Junior Graphic Designer">Junior Graphic Designer</option>
                      <option value="SMM (Social Media Marketer)">SMM (Social Media Marketer)</option>
                      <option value="Performance Marketer & Lead">Performance Marketer & Lead</option>
                    </select>
                  ) : (
                    selectedEmployee.designation || "No designation"
                  )}
                </p>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: tierColor(selectedEmployee.role) + "18",
                    color: tierColor(selectedEmployee.role),
                  }}
                >
                  {editMode ? (
                    <select
                      name="role"
                      value={editFormData.role}
                      onChange={handleEditFormChange}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: tierColor(editFormData.role),
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="HR">HR Manager</option>
                      <option value="MD">Managing Director</option>
                    </select>
                  ) : (
                    tierLabel(selectedEmployee.role)
                  )}
                </span>
              </div>
              <button
                onClick={() => {
                  if (editMode) {
                    handleCancelEdit();
                  } else {
                    setModalOpen(false);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                ×
              </button>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20}}>
              {[
                { 
                  label: "Department", 
                  value: editMode ? (
                    <select
                      name="department"
                      value={editFormData.department}
                      onChange={handleEditFormChange}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        width: "100%",
                        boxSizing: "border-box",
                        background: "white"
                      }}
                    >
                      <option value="">Select Department</option>
                      <option value="Video Editor">Video Editor</option>
                      <option value="Graphic">Graphic</option>
                      <option value="Operation & Support">Operation & Support</option>
                      <option value="Performance Marketing">Performance Marketing</option>
                      <option value="SMM">SMM</option>
                      <option value="GMB">GMB</option>
                      <option value="Development">Development</option>
                    </select>
                  ) : (selectedEmployee.department || "—"),
                  editable: true
                },
                { 
                  label: "Email", 
                  value: editMode ? (
                    <input
                      type="email"
                      name="email"
                      value={selectedEmployee.email}
                      disabled
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        width: "100%",
                        boxSizing: "border-box",
                        background: "#f3f4f6",
                        cursor: "not-allowed"
                      }}
                    />
                  ) : selectedEmployee.email,
                  editable: true
                },
                { 
                  label: "Phone", 
                  value: editMode ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editFormData.phone}
                      onChange={handleEditFormChange}
                      placeholder="Phone number"
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        width: "100%",
                        boxSizing: "border-box",
                        background: "white"
                      }}
                    />
                  ) : (selectedEmployee.phone || "—"),
                  editable: true
                },
                { 
                  label: "Status", 
                  value: editMode ? (
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditFormChange}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        width: "100%",
                        boxSizing: "border-box",
                        background: "white",
                        cursor: "pointer"
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Resigned">Resigned</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  ) : (
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: selectedEmployee.status === "Active" ? "#d1fae5" : 
                                 selectedEmployee.status === "Resigned" ? "#fef3c7" : "#fee2e2",
                      color: selectedEmployee.status === "Active" ? "#065f46" : 
                             selectedEmployee.status === "Resigned" ? "#92400e" : "#7f1d1d"
                    }}>
                      {selectedEmployee.status || "Active"}
                    </span>
                  ),
                  editable: true
                },
                { 
                  label: "Work Mode", 
                  value: editMode ? (
                    <select
                      name="workMode"
                      value={editFormData.workMode}
                      onChange={handleEditFormChange}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        width: "100%",
                        boxSizing: "border-box",
                        background: "white",
                        cursor: "pointer"
                      }}
                    >
                      <option value="ONSITE">On-site</option>
                      <option value="REMOTE">Remote</option>
                      <option value="CLIENT_OFFICE">Client Office</option>
                    </select>
                  ) : (
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: selectedEmployee.workMode === "REMOTE" ? "#e0f2fe" : 
                                 selectedEmployee.workMode === "CLIENT_OFFICE" ? "#fef3c7" : "#f0fdf4",
                      color: selectedEmployee.workMode === "REMOTE" ? "#0369a1" : 
                             selectedEmployee.workMode === "CLIENT_OFFICE" ? "#92400e" : "#166534"
                    }}>
                      {selectedEmployee.workMode === "REMOTE" ? "Remote" : 
                       selectedEmployee.workMode === "CLIENT_OFFICE" ? "Client Office" : "On-site"}
                    </span>
                  ),
                  editable: true
                },
                { 
                  label: "Reporting To", 
                  value: editMode ? (
                    <select
                      name="reportingTo"
                      value={editFormData.reportingTo}
                      onChange={handleEditFormChange}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 13,
                        fontWeight: 600,
                        width: "100%",
                        boxSizing: "border-box",
                        background: "white",
                        cursor: "pointer"
                      }}
                    >
                      <option value="">Select Manager</option>
                      {employees.filter(emp => emp.role === "MANAGER" || emp.role === "HR" || emp.role === "MD").map(manager => (
                        <option key={manager.id} value={manager.id}>{manager.fullName}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {selectedEmployee.reportingManager?.fullName || "—"}
                    </span>
                  ),
                  editable: true
                },
              ].map((field) => (
                <div key={field.label} style={{ 
                  background: field.editable && editMode ? "#f0f9ff" : "#f8fafc", 
                  borderRadius: 8, 
                  padding: "12px 14px",
                  border: field.editable && editMode ? "1px solid #bfdbfe" : "none"
                }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{field.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{field.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              {editMode ? (
                <>
                  <button
                    onClick={handleSaveEmployee}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {(user?.role === "HR" || user?.role === "MD") && (
                    <button
                      onClick={handleEditEmployee}
                      style={{
                        flex: 1,
                        padding: 12,
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit Employee
                    </button>
                  )}
                  <button
                    onClick={() => setModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Activity Modal */}
      {showActivity && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              width: "90%",
              maxWidth: "1200px",
              height: "90vh",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
                Employee Activity
              </h2>
              <button
                onClick={() => {
                  setShowActivity(false);
                  setSelectedEmployeeForActivity(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <EmployeeActivity employeeId={selectedEmployeeForActivity} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

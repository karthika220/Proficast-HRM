import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import HRDashboard from "./pages/HRDashboard";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Unauthorized from "./pages/Unauthorized";
import EmployeeActivity from "./components/EmployeeActivity";
import Escalation from "./pages/Escalation";
import MyEscalations from "./pages/MyEscalations";

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected routes - all authenticated users */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <Layout>
                  <Attendance />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave"
            element={
              <ProtectedRoute>
                <Layout>
                  <Leave />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:employeeId?"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/:employeeId/activity"
            element={
              <ProtectedRoute>
                <Layout>
                  <EmployeeActivity />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/escalation"
            element={
              <ProtectedRoute>
                <Layout>
                  <Escalation />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-escalations"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyEscalations />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected routes - HR/MD only (minTier=2) */}
          <Route
            path="/hr-dashboard"
            element={
              <ProtectedRoute minTier={2}>
                <Layout>
                  <HRDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute minTier={2}>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Unauthorized page */}
          <Route
            path="/unauthorized"
            element={<Unauthorized />}
          />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;


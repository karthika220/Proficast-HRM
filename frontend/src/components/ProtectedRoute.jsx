import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function ProtectedRoute({ children, minTier }) {
  const { user, loading, isAuthenticated } = useContext(UserContext);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  // Role hierarchy: MD=1, HR=2, MANAGER=3, EMPLOYEE=4
  const roleHierarchy = {
    MD: 1,
    HR: 2,
    MANAGER: 3,
    EMPLOYEE: 4,
  };

  // Check if user has sufficient permissions
  if (minTier && roleHierarchy[user?.role] > minTier) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

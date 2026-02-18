import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const nav = useNavigate();

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-content">
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <button onClick={() => nav("/dashboard")}>Back to Dashboard</button>
      </div>
    </div>
  );
}

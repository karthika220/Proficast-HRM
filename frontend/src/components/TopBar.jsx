import React, { useState, useEffect } from "react";

export default function TopBar() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 220,
        right: 0,
        height: 70,
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingRight: 24,
        paddingLeft: 24,
        zIndex: 50,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Left: Date and Time */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{formatDate(currentTime)}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{formatTime(currentTime)}</div>
      </div>
    </div>
  );
}

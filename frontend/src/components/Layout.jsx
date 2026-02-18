import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import api from "../api/axios";

export default function Layout({ children }) {
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const res = await api.get("/leave?status=pending");
      setPendingCount(res.data?.length || 0);
    } catch (err) {
      console.log("Could not fetch pending count");
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc" }}>
      <Sidebar pendingCount={pendingCount} />
      <div style={{ marginLeft: 220, display: "flex", flexDirection: "column", flex: 1 }}>
        <TopBar onCheckIn={fetchPendingCount} />
        <main
          style={{
            marginTop: 70,
            flex: 1,
            overflowY: "auto",
            padding: "24px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

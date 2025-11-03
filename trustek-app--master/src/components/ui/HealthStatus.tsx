import React, { useEffect, useState } from "react";

const HealthStatus: React.FC = () => {
  const [status, setStatus] = useState<string>("Checking…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8081/api/health");
        if (!res.ok) throw new Error("Server not responding");
        const data = await res.json();
        const raw = (data.status || "healthy").toString().toLowerCase();
        const mapped = raw === "healthy" ? "Operational" : raw;
        setStatus(mapped);
      } catch (err) {
        console.error("Health check failed:", err);
        setError(err.message || "Failed to connect");
        setStatus("Offline ❌");
      }
    };

    checkHealth();
  }, []);

  return (
    <div className="mt-6 p-4 border rounded-lg bg-background text-foreground shadow-md">
      <h2 className="text-lg font-semibold mb-2">Service Status</h2>
      {error ? (
        <p className="text-red-500 font-medium">{status} ({error})</p>
      ) : (
        <p className="text-green-500 font-medium">{status}</p>
      )}
    </div>
  );
};

export default HealthStatus;

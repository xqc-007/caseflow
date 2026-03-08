import { useEffect, useState } from "react";

function ActivityTimeline({ caseId }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/cases/${caseId}/activity`);
      const data = await response.json();
      setActivity(data);
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [caseId]);

  return (
    <div
      style={{
        marginTop: "24px",
        borderTop: "1px solid #e5e7eb",
        paddingTop: "24px",
      }}
    >
      <h3 style={{ marginBottom: "16px" }}>Activity Timeline</h3>

      {loading ? (
        <p>Loading activity...</p>
      ) : activity.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No activity yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {activity.map((item) => (
            <div
              key={item.id}
              style={{
                borderLeft: "3px solid #111827",
                paddingLeft: "14px",
                paddingTop: "2px",
                paddingBottom: "2px",
              }}
            >
              <p style={{ marginBottom: "6px" }}>{item.action_text}</p>
              <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                {item.user_name || "System"} · {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityTimeline;
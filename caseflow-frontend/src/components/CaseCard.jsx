function CaseCard({ item, onView }) {
  const statusColor =
    item.status === "Closed"
      ? "#166534"
      : item.status === "In Progress"
      ? "#1d4ed8"
      : "#92400e";

  const priorityColor =
    item.priority === "Urgent"
      ? "#b91c1c"
      : item.priority === "High"
      ? "#dc2626"
      : item.priority === "Medium"
      ? "#2563eb"
      : "#4b5563";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "18px",
        backgroundColor: "#fff",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: "16px",
          marginBottom: "12px",
        }}
      >
        <div>
          <h3 style={{ marginBottom: "8px" }}>{item.title}</h3>
          <p style={{ color: "#4b5563" }}>{item.description}</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: "999px",
              backgroundColor: "#f3f4f6",
              color: statusColor,
              fontWeight: "600",
              fontSize: "0.85rem",
              marginBottom: "8px",
            }}
          >
            {item.status}
          </span>
          <br />
          <span
            style={{
              display: "inline-block",
              padding: "6px 10px",
              borderRadius: "999px",
              backgroundColor: "#f9fafb",
              color: priorityColor,
              fontWeight: "600",
              fontSize: "0.85rem",
            }}
          >
            {item.priority}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          fontSize: "0.95rem",
          color: "#374151",
          marginBottom: "14px",
        }}
      >
        <p><strong>Assigned:</strong> {item.assigned_to_name || item.assigned_to || "Unassigned"}</p>
        <p><strong>Created By:</strong> {item.created_by_name || item.created_by || "Unknown"}</p>
        <p><strong>Due Date:</strong> {item.due_date || "No due date"}</p>
      </div>

      <button
        onClick={() => onView(item)}
        style={{
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #d1d5db",
          backgroundColor: "#111827",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        View Case
      </button>
    </div>
  );
}

export default CaseCard;
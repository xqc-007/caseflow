function CaseCard({ item, onView }) {
  const statusClass =
    item.status === "Closed"
      ? "badge badge-status-closed"
      : item.status === "In Progress"
      ? "badge badge-status-progress"
      : "badge badge-status-new";

  const priorityClass =
    item.priority === "Urgent"
      ? "badge badge-priority-urgent"
      : item.priority === "High"
      ? "badge badge-priority-high"
      : item.priority === "Medium"
      ? "badge badge-priority-medium"
      : "badge badge-priority-low";

  return (
    <div className="section-card list-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          gap: 16,
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "1.25rem",
              letterSpacing: "-0.03em",
            }}
          >
            {item.title}
          </h3>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
            {item.description}
          </p>
        </div>

        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <span className={statusClass}>{item.status}</span>
          <span className={priorityClass}>{item.priority}</span>
        </div>
      </div>

      <div className="meta-grid" style={{ marginBottom: 16 }}>
        <p><strong>Assigned:</strong> {item.assigned_to_name || item.assigned_to || "Unassigned"}</p>
        <p><strong>Created By:</strong> {item.created_by_name || item.created_by || "Unknown"}</p>
        <p><strong>Due Date:</strong> {item.due_date || "No due date"}</p>
      </div>

      <button className="ghost-button" onClick={() => onView(item)}>
        View Case
      </button>
    </div>
  );
}

export default CaseCard;
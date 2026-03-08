import NotesPanel from "./NotesPanel";

function CaseDetails({ selectedCase, onBack }) {
  if (!selectedCase) return null;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        backgroundColor: "#fff",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <button
        onClick={onBack}
        style={{
          marginBottom: "20px",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid #d1d5db",
          backgroundColor: "#f9fafb",
          cursor: "pointer",
        }}
      >
        Back to Cases
      </button>

      <h2 style={{ marginBottom: "12px" }}>{selectedCase.title}</h2>
      <p style={{ color: "#4b5563", marginBottom: "20px" }}>
        {selectedCase.description}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <p><strong>Status:</strong> {selectedCase.status}</p>
          <p><strong>Priority:</strong> {selectedCase.priority}</p>
        </div>

        <div>
          <p><strong>Assigned To:</strong> {selectedCase.assigned_to_name || selectedCase.assigned_to || "Unassigned"}</p>
          <p><strong>Created By:</strong> {selectedCase.created_by_name || selectedCase.created_by || "Unknown"}</p>
        </div>
      </div>

      <div>
        <p><strong>Due Date:</strong> {selectedCase.due_date || "No due date"}</p>
        <p><strong>Case ID:</strong> {selectedCase.id}</p>
      </div>

      <NotesPanel caseId={selectedCase.id} />
    </div>
  );
}

export default CaseDetails;
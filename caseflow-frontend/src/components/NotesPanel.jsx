import { useState } from "react";
import { apiRequest } from "../api";
import { useList } from "../useList";

function NotesPanel({ caseId, onNoteAdded }) {
  const { data: notes, loading, error, retry } = useList(`/cases/${caseId}/notes`);
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!noteText.trim()) return;

    try {
      setSubmitting(true);

      setSaveError("");
      await apiRequest(`/cases/${caseId}/notes`, { method: "POST", body: { note_text: noteText } });
      setNoteText("");
      retry();
      onNoteAdded();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "24px",
        borderTop: "1px solid #e5e7eb",
        paddingTop: "24px",
      }}
    >
      <h3 style={{ marginBottom: "16px" }}>Case Notes</h3>

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <textarea
          aria-label="Case note"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note..."
          rows="4"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            marginBottom: "12px",
          }}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid #111827",
            backgroundColor: "#111827",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {submitting ? "Adding..." : "Add Note"}
        </button>
      </form>

      {saveError && <p role="alert">{saveError}</p>}
      {error && <div role="alert"><p>{error}</p><button onClick={retry}>Try again</button></div>}
      {loading ? (
        <p>Loading notes...</p>
      ) : error ? null : notes.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No notes yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "14px",
                backgroundColor: "#f9fafb",
              }}
            >
              <p style={{ marginBottom: "8px" }}>{note.note_text}</p>
              <p style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                {note.author_name || "Unknown"} · {new Date(note.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotesPanel;
import { useEffect, useState } from "react";

function NotesPanel({ caseId }) {
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/cases/${caseId}/notes`);
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [caseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!noteText.trim()) return;

    try {
      setSubmitting(true);

      const response = await fetch(`http://localhost:5001/cases/${caseId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: 1,
          note_text: noteText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      setNoteText("");
      fetchNotes();
    } catch (error) {
      console.error(error);
      alert("Failed to add note");
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

      {loading ? (
        <p>Loading notes...</p>
      ) : notes.length === 0 ? (
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
import { useState } from "react";
import NotesPanel from "./NotesPanel";
import ActivityTimeline from "./ActivityTimeline";

import { apiRequest } from "../api";

function CaseDetails({ selectedCase, onBack, onCaseUpdated }) {

  const [status, setStatus] = useState(selectedCase.status);
  const [priority, setPriority] = useState(selectedCase.priority);
  const [assignedTo, setAssignedTo] = useState(selectedCase.assigned_to || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activityVersion, setActivityVersion] = useState(0);
  const refreshActivity = () => setActivityVersion(version => version + 1);

  const updateCase = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest(`/cases/${selectedCase.id}`, {
        method: "PUT", body: { status, priority, assigned_to: assignedTo || null },
      });
      onCaseUpdated(updated);
      refreshActivity();
      setMessage("Case updated.");
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      border:"1px solid #e5e7eb",
      borderRadius:"16px",
      background:"#fff",
      padding:"24px",
      marginBottom:"24px"
    }}>

      <button onClick={onBack}>
        Back to Cases
      </button>

      <h2>{selectedCase.title}</h2>

      <p>{selectedCase.description}</p>

      <div style={{display:"grid",gap:"12px",maxWidth:"300px"}}>

        <label htmlFor="case-status">Status</label>

        <select
          id="case-status"
          value={status}
          onChange={(e)=>setStatus(e.target.value)}
        >
          <option>New</option>
          <option>In Progress</option>
          <option>Awaiting Response</option>
          <option>Closed</option>
        </select>

        <label htmlFor="case-priority">Priority</label>

        <select
          id="case-priority"
          value={priority}
          onChange={(e)=>setPriority(e.target.value)}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>

        <label htmlFor="case-assigned">Assigned User ID</label>

        <input
          id="case-assigned"
          type="number"
          value={assignedTo}
          onChange={(e)=>setAssignedTo(e.target.value)}
        />

        <button onClick={updateCase} disabled={saving}>
          {saving ? "Updating..." : "Update Case"}
        </button>

      </div>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <NotesPanel caseId={selectedCase.id} onNoteAdded={refreshActivity} />
      <ActivityTimeline caseId={selectedCase.id} refreshKey={activityVersion} />

    </div>
  );
}

export default CaseDetails;
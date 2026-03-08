import { useState } from "react";
import NotesPanel from "./NotesPanel";
import ActivityTimeline from "./ActivityTimeline";

function CaseDetails({ selectedCase, onBack }) {

  const [status, setStatus] = useState(selectedCase.status);
  const [priority, setPriority] = useState(selectedCase.priority);
  const [assignedTo, setAssignedTo] = useState(selectedCase.assigned_to || "");

  const updateCase = async () => {

    const token = localStorage.getItem("caseflow_token");

    await fetch(`http://localhost:5001/cases/${selectedCase.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status,
        priority,
        assigned_to: assignedTo || null
      })
    });

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

        <label>Status</label>

        <select
          value={status}
          onChange={(e)=>setStatus(e.target.value)}
        >
          <option>New</option>
          <option>In Progress</option>
          <option>Awaiting Response</option>
          <option>Closed</option>
        </select>

        <label>Priority</label>

        <select
          value={priority}
          onChange={(e)=>setPriority(e.target.value)}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>

        <label>Assigned User ID</label>

        <input
          type="number"
          value={assignedTo}
          onChange={(e)=>setAssignedTo(e.target.value)}
        />

        <button onClick={updateCase}>
          Update Case
        </button>

      </div>

      <NotesPanel caseId={selectedCase.id} />
      <ActivityTimeline caseId={selectedCase.id} />

    </div>
  );
}

export default CaseDetails;
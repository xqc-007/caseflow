import { useState } from "react";

function CreateCaseForm({ onCaseCreated }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "New",
    priority: "Medium",
    due_date: "",
    assigned_to: "",
    created_by: "1",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("caseflow_token");

      const response = await fetch("http://localhost:5001/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
          created_by: formData.created_by ? Number(formData.created_by) : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create case");
      }

      setFormData({
        title: "",
        description: "",
        status: "New",
        priority: "Medium",
        due_date: "",
        assigned_to: "",
        created_by: "1",
      });

      onCaseCreated();
    } catch (error) {
      console.error(error);
      alert("Failed to create case");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="premium-panel form-card">
      <div className="soft-label" style={{ marginBottom: 12 }}>
        New Entry
      </div>
      <h2 style={{ margin: "0 0 18px", letterSpacing: "-0.04em" }}>Create Case</h2>

      <form onSubmit={handleSubmit} className="form-grid">
        <input
          type="text"
          name="title"
          placeholder="Case title"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          placeholder="Case description"
          value={formData.description}
          onChange={handleChange}
          rows="4"
        />

        <div className="split-grid">
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
          >
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="Awaiting Response">Awaiting Response</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        <div className="split-grid">
          <input
            type="date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
          />

          <input
            type="number"
            name="assigned_to"
            placeholder="Assigned user ID"
            value={formData.assigned_to}
            onChange={handleChange}
          />
        </div>

        <div>
          <button className="glow-button" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Case"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateCaseForm;
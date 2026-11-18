import { useState } from "react";

import { apiRequest } from "../api";

function CreateCaseForm({ onCaseCreated }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "New",
    priority: "Medium",
    due_date: "",
    assigned_to: "",
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
    setError("");
    setMessage("");

    try {
      await apiRequest("/cases", {
        method: "POST", body: { ...formData, assigned_to: formData.assigned_to || null },
      });
      setMessage("Case created.");
      setFormData({
        title: "",
        description: "",
        status: "New",
        priority: "Medium",
        due_date: "",
        assigned_to: "",
      });

      onCaseCreated();
    } catch (error) {
      setError(error.message);
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

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
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
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
      const response = await fetch("http://localhost:5001/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    <div
      style={{
        border: "1px solid #dcdcdc",
        borderRadius: "12px",
        padding: "20px",
        backgroundColor: "#fff",
        marginBottom: "32px",
      }}
    >
      <h2 style={{ marginBottom: "16px" }}>Create Case</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
        <input
          type="text"
          name="title"
          placeholder="Case title"
          value={formData.title}
          onChange={handleChange}
          required
          style={{ padding: "10px" }}
        />

        <textarea
          name="description"
          placeholder="Case description"
          value={formData.description}
          onChange={handleChange}
          rows="4"
          style={{ padding: "10px" }}
        />

        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          style={{ padding: "10px" }}
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
          style={{ padding: "10px" }}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

        <input
          type="date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          style={{ padding: "10px" }}
        />

        <input
          type="number"
          name="assigned_to"
          placeholder="Assigned user ID"
          value={formData.assigned_to}
          onChange={handleChange}
          style={{ padding: "10px" }}
        />

        <button type="submit" style={{ padding: "12px", cursor: "pointer" }} disabled={submitting}>
          {submitting ? "Creating..." : "Create Case"}
        </button>
      </form>
    </div>
  );
}

export default CreateCaseForm;
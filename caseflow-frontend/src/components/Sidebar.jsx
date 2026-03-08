function Sidebar() {
  return (
    <aside
      style={{
        width: "220px",
        backgroundColor: "#111827",
        color: "#f9fafb",
        padding: "24px 20px",
        borderRadius: "16px",
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <h2 style={{ fontSize: "1.3rem", marginBottom: "28px" }}>CaseFlow</h2>

      <nav style={{ display: "grid", gap: "14px" }}>
        <a href="#" style={{ color: "#f9fafb", textDecoration: "none" }}>Dashboard</a>
        <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Cases</a>
        <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Create Case</a>
        <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Users</a>
        <a href="#" style={{ color: "#9ca3af", textDecoration: "none" }}>Reports</a>
      </nav>
    </aside>
  );
}

export default Sidebar;
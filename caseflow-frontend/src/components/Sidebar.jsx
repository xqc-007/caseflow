function Sidebar({ activeView, setActiveView }) {
  const navItems = ["Dashboard", "Cases", "Create Case", "Users", "Reports"];

  return (
    <aside
      className="premium-panel"
      style={{
        padding: "24px 20px",
        minHeight: "calc(100vh - 40px)",
      }}
    >
      <h2
        style={{
          fontSize: "1.9rem",
          margin: "0 0 28px",
          letterSpacing: "-0.04em",
        }}
      >
        CaseFlow
      </h2>

      <nav style={{ display: "grid", gap: 10 }}>
        {navItems.map((item) => {
          const isActive = activeView === item;

          return (
            <button
              key={item}
              onClick={() => setActiveView(item)}
              style={{
                background: isActive
                  ? "linear-gradient(180deg, rgba(46,155,137,0.22), rgba(46,155,137,0.12))"
                  : "transparent",
                color: isActive ? "#f5f7f8" : "#9aa7ad",
                border: isActive ? "1px solid rgba(46,155,137,0.28)" : "1px solid transparent",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: isActive ? "600" : "500",
              }}
            >
              {item}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
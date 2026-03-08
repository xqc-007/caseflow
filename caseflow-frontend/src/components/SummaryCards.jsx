function SummaryCards({ cases }) {
  const totalCases = cases.length;
  const openCases = cases.filter((item) => item.status !== "Closed").length;
  const highPriority = cases.filter(
    (item) => item.priority === "High" || item.priority === "Urgent"
  ).length;
  const closedCases = cases.filter((item) => item.status === "Closed").length;

  const cards = [
    { label: "Total Cases", value: totalCases },
    { label: "Open Cases", value: openCases },
    { label: "High Priority", value: highPriority },
    { label: "Closed Cases", value: closedCases },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "28px",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <p style={{ color: "#6b7280", marginBottom: "8px", fontSize: "0.9rem" }}>
            {card.label}
          </p>
          <h3 style={{ fontSize: "1.8rem" }}>{card.value}</h3>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
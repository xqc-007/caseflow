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
    <div className="metric-grid">
      {cards.map((card) => (
        <div key={card.label} className="premium-panel metric-card">
          <p className="metric-label">{card.label}</p>
          <h3 className="metric-value">{card.value}</h3>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
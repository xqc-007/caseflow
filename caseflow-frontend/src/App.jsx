import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import SummaryCards from "./components/SummaryCards";
import CreateCaseForm from "./components/CreateCaseForm";
import CaseCard from "./components/CaseCard";
import CaseDetails from "./components/CaseDetails";

function App() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5001/cases");

      if (!response.ok) {
        throw new Error("Failed to fetch cases");
      }

      const data = await response.json();
      setCases(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <Sidebar />

        <main>
          <Header />
          <SummaryCards cases={cases} />
          <CreateCaseForm onCaseCreated={fetchCases} />

          {selectedCase ? (
            <CaseDetails
              selectedCase={selectedCase}
              onBack={() => setSelectedCase(null)}
            />
          ) : (
            <section>
              <h2 style={{ marginBottom: "16px" }}>Cases</h2>

              {loading && <p>Loading cases...</p>}
              {error && <p style={{ color: "red" }}>{error}</p>}
              {!loading && !error && cases.length === 0 && <p>No cases found.</p>}

              {!loading && !error && cases.map((item) => (
                <CaseCard
                  key={item.id}
                  item={item}
                  onView={setSelectedCase}
                />
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
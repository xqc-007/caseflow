import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import SummaryCards from "./components/SummaryCards";
import CreateCaseForm from "./components/CreateCaseForm";
import CaseCard from "./components/CaseCard";
import CaseDetails from "./components/CaseDetails";
import Login from "./components/Login";
import CasesToolbar from "./components/CasesToolbar";
import "./index.css";

function App() {
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("Dashboard");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const casesPerPage = 5;

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("caseflow_token");

      const response = await fetch("http://localhost:5001/cases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cases");
      }

      const data = await response.json();
      setCases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("caseflow_user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter, sortBy]);

  const filteredCases = useMemo(() => {
    let result = cases.filter((item) => {
      const matchesSearch =
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    if (sortBy === "priority") {
      const order = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      result.sort((a, b) => (order[b.priority] || 0) - (order[a.priority] || 0));
    }

    if (sortBy === "status") {
      result.sort((a, b) => a.status.localeCompare(b.status));
    }

    if (sortBy === "newest") {
      result.sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    }

    return result;
  }, [cases, searchTerm, statusFilter, priorityFilter, sortBy]);

  const indexOfLastCase = currentPage * casesPerPage;
  const indexOfFirstCase = indexOfLastCase - casesPerPage;
  const paginatedCases = filteredCases.slice(indexOfFirstCase, indexOfLastCase);
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / casesPerPage));

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="premium-shell">
      <div className="premium-grid">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        <main style={{ minWidth: 0, width: "100%" }}>
          <Header />

          {selectedCase ? (
            <CaseDetails
              selectedCase={selectedCase}
              onBack={() => setSelectedCase(null)}
            />
          ) : (
            <>
              {activeView === "Dashboard" && (
                <>
                  <SummaryCards cases={cases} />
                  <CreateCaseForm onCaseCreated={fetchCases} />
                </>
              )}

              {activeView === "Cases" && (
                <section>
                  <h2 style={{ marginBottom: 16, letterSpacing: "-0.04em" }}>Cases</h2>

                  <CasesToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    priorityFilter={priorityFilter}
                    setPriorityFilter={setPriorityFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                  />

                  {loading && <p>Loading cases...</p>}
                  {error && <p style={{ color: "#ff8d8d" }}>{error}</p>}
                  {!loading && !error && filteredCases.length === 0 && (
                    <p>No matching cases found.</p>
                  )}

                  {!loading &&
                    !error &&
                    paginatedCases.map((item) => (
                      <CaseCard
                        key={item.id}
                        item={item}
                        onView={setSelectedCase}
                      />
                    ))}

                  {!loading && !error && filteredCases.length > 0 && (
                    <div
                      style={{
                        marginTop: 20,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="ghost-button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                      >
                        Previous
                      </button>

                      <span style={{ color: "var(--muted)" }}>
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        className="ghost-button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </section>
              )}

              {activeView === "Create Case" && (
                <section>
                  <CreateCaseForm onCaseCreated={fetchCases} />
                </section>
              )}

              {activeView === "Users" && (
                <div className="premium-panel" style={{ padding: 24 }}>
                  <h2 style={{ marginTop: 0 }}>Users</h2>
                  <p style={{ color: "var(--muted)" }}>Users view coming next.</p>
                </div>
              )}

              {activeView === "Reports" && (
                <div className="premium-panel" style={{ padding: 24 }}>
                  <h2 style={{ marginTop: 0 }}>Reports</h2>
                  <p style={{ color: "var(--muted)" }}>Reports view coming next.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
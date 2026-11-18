import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import SummaryCards from "./components/SummaryCards";
import CreateCaseForm from "./components/CreateCaseForm";
import CaseCard from "./components/CaseCard";
import CaseDetails from "./components/CaseDetails";
import Login from "./components/Login";
import CasesToolbar from "./components/CasesToolbar";
import "./index.css";

import { apiList, readSession, SESSION_EXPIRED } from "./api";

function App() {
  const [user, setUser] = useState(readSession);
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

  const [sessionMessage, setSessionMessage] = useState("");
  const fetchCases = useCallback(async (signal) => {
    const token = localStorage.getItem("caseflow_token");
    try {
      setLoading(true);
      setError("");
      const data = await apiList("/cases", { signal });
      if (!signal?.aborted && localStorage.getItem("caseflow_token") === token) setCases(data);
    } catch (err) {
      if (err.name !== "AbortError" && localStorage.getItem("caseflow_token") === token) setError(err.message);
    } finally {
      if (!signal?.aborted && localStorage.getItem("caseflow_token") === token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const expired = () => {
      setUser(null);
      setCases([]);
      setSelectedCase(null);
      setSessionMessage("Your session has expired. Please sign in again.");
    };
    window.addEventListener(SESSION_EXPIRED, expired);
    return () => window.removeEventListener(SESSION_EXPIRED, expired);
  }, []);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetchCases(controller.signal);
    return () => controller.abort();
  }, [user, fetchCases]);

  const handleCaseUpdated = (updated) => {
    setCases(items => items.map(item => item.id === updated.id ? updated : item));
    setSelectedCase(current => current?.id === updated.id ? updated : current);
  };

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

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / casesPerPage));
  const page = Math.min(currentPage, totalPages);
  const indexOfFirstCase = (page - 1) * casesPerPage;
  const paginatedCases = filteredCases.slice(indexOfFirstCase, indexOfFirstCase + casesPerPage);

  if (!user) {
    return <Login message={sessionMessage} onLogin={(nextUser) => { setSessionMessage(""); setUser(nextUser); }} />;
  }

  return (
    <div className="premium-shell">
      <div className="premium-grid">
        <Sidebar activeView={activeView} setActiveView={(view) => { setSelectedCase(null); setActiveView(view); }} />

        <main style={{ minWidth: 0, width: "100%" }}>
          <Header />
          {loading && <p role="status">Loading cases...</p>}
          {error && <div role="alert"><p>{error}</p><button onClick={() => fetchCases()}>Try again</button></div>}

          {selectedCase ? (
            <CaseDetails
              key={selectedCase.id}
              selectedCase={selectedCase}
              onCaseUpdated={handleCaseUpdated}
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
                        disabled={page === 1}
                        onClick={() => setCurrentPage(page - 1)}
                      >
                        Previous
                      </button>

                      <span style={{ color: "var(--muted)" }}>
                        Page {page} of {totalPages}
                      </span>

                      <button
                        className="ghost-button"
                        disabled={page === totalPages}
                        onClick={() => setCurrentPage(page + 1)}
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
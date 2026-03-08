function Header() {
  return (
    <header style={{ marginBottom: "24px" }}>
      <div className="soft-label" style={{ marginBottom: 10 }}>
        Operations Dashboard
      </div>
      <h1 className="page-title">CaseFlow</h1>
      <p className="page-subtitle">
        Internal case and task management system.
      </p>
    </header>
  );
}

<button
onClick={()=>{
localStorage.removeItem("caseflow_token");
localStorage.removeItem("caseflow_user");
window.location.reload();
}}
>
Logout
</button>

export default Header;
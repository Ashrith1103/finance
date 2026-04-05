import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatPeriodLabel = (value) => {
  if (!value) {
    return "Unknown";
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");

    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric"
    });
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
};

const summaryCards = (data) => [
  {
    label: "Total income",
    value: formatCurrency(data?.totalIncome),
    tone: "income"
  },
  {
    label: "Total expense",
    value: formatCurrency(data?.totalExpense),
    tone: "expense"
  },
  {
    label: "Net balance",
    value: formatCurrency(data?.netBalance),
    tone: "balance"
  }
];

const roleDescriptions = {
  VIEWER: "Can manage their own finance records and view only their personal dashboard.",
  ANALYST: "Can compare users, inspect records, and review system analytics.",
  ADMIN: "Can manage users, create and remove records, and control access."
};

const roleFeatureMap = {
  VIEWER: ["Own summary", "Create own records", "Edit own records", "Delete own records"],
  ANALYST: ["Own summary", "Overall summary", "User summary", "Read all records"],
  ADMIN: [
    "Own summary",
    "Overall summary",
    "User summary",
    "Read all records",
    "Create records",
    "Delete records",
    "Create users",
    "Toggle status"
  ]
};

const defaultRecordDraft = {
  amount: "",
  type: "EXPENSE",
  category: "",
  date: new Date().toISOString().slice(0, 10),
  notes: ""
};

const defaultRecordFilters = {
  search: "",
  type: "",
  category: "",
  startDate: "",
  endDate: ""
};

const defaultUserDraft = {
  name: "",
  email: "",
  password: "",
  role: "VIEWER"
};

function App() {
  const recordsSectionRef = useRef(null);
  const usersSectionRef = useRef(null);
  const userEditorSectionRef = useRef(null);
  const startDateFilterRef = useRef(null);
  const endDateFilterRef = useRef(null);

  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [summaryScope, setSummaryScope] = useState("self");
  const [selectedSummaryUserId, setSelectedSummaryUserId] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [recordDraft, setRecordDraft] = useState(defaultRecordDraft);
  const [recordFilters, setRecordFilters] = useState(defaultRecordFilters);
  const [userDraft, setUserDraft] = useState(defaultUserDraft);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [data, setData] = useState(null);
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [summaryUsers, setSummaryUsers] = useState([]);
  const [authState, setAuthState] = useState("idle");
  const [summaryState, setSummaryState] = useState("idle");
  const [recordsState, setRecordsState] = useState("idle");
  const [usersState, setUsersState] = useState("idle");
  const [summaryUsersState, setSummaryUsersState] = useState("idle");
  const [recordActionState, setRecordActionState] = useState("idle");
  const [userActionState, setUserActionState] = useState("idle");
  const [message, setMessage] = useState("");

  const cards = useMemo(() => summaryCards(data), [data]);
  const filteredRecordTotals = useMemo(() => {
    return records.reduce(
      (totals, record) => {
        const amount = Number(record.amount || 0);

        if (record.type === "INCOME") {
          totals.income += amount;
        }

        if (record.type === "EXPENSE") {
          totals.expense += amount;
        }

        return totals;
      },
      { income: 0, expense: 0 }
    );
  }, [records]);
  const userRole = currentUser?.role;
  const canViewRecords = Boolean(userRole);
  const canManageUsers = userRole === "ADMIN";
  const canManageRecords = userRole === "ADMIN" || userRole === "VIEWER";
  const hasGlobalRecordAccess = userRole === "ADMIN";
  const canViewAdvancedSummary = userRole === "ANALYST" || userRole === "ADMIN";

  const scrollToRef = (ref) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 120);
  };

  const openDatePicker = (inputRef) => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.focus();

    if (typeof inputRef.current.showPicker === "function") {
      inputRef.current.showPicker();
    }
  };

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleRecordDraftChange = (field) => (event) => {
    setRecordDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleUserDraftChange = (field) => (event) => {
    setUserDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleRecordFilterChange = (field) => (event) => {
    setRecordFilters((current) => ({ ...current, [field]: event.target.value }));
  };

  const setSuccessMessage = (nextMessage) => {
    setAuthState("idle");
    setSummaryState("idle");
    setRecordsState("idle");
    setUsersState("idle");
    setSummaryUsersState("idle");
    setRecordActionState("success");
    setUserActionState("success");
    setMessage(nextMessage);
  };

  const setErrorMessage = (nextMessage, source) => {
    setAuthState(source === "auth" ? "error" : "idle");
    setSummaryState(source === "summary" ? "error" : "idle");
    setRecordsState(source === "records" ? "error" : "idle");
    setUsersState(source === "users" ? "error" : "idle");
    setSummaryUsersState(source === "summaryUsers" ? "error" : "idle");
    setRecordActionState(source === "recordAction" ? "error" : "idle");
    setUserActionState(source === "userAction" ? "error" : "idle");
    setMessage(nextMessage);
  };

  const apiRequest = async (path, options = {}) => {
    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = token;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Request failed.");
    }

    return result;
  };

  const resetDashboardState = () => {
    setData(null);
    setRecords([]);
    setUsers([]);
    setSummaryUsers([]);
    setSelectedSummaryUserId("");
    setSummaryScope("self");
    setSummaryState("idle");
    setRecordsState("idle");
    setUsersState("idle");
    setSummaryUsersState("idle");
    setRecordActionState("idle");
    setUserActionState("idle");
    setRecordDraft(defaultRecordDraft);
    setRecordFilters(defaultRecordFilters);
    setUserDraft(defaultUserDraft);
    setEditingRecordId(null);
    setEditingUserId(null);
  };

  const resetAuthFeedback = () => {
    setAuthState("idle");
    setRecordActionState("idle");
    setUserActionState("idle");
    setMessage("");
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    resetAuthFeedback();
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setAuthState("error");
      setMessage("Enter both email and password to continue.");
      return;
    }

    setAuthState("loading");
    setMessage("");

    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password
        })
      });

      setToken(result.token);
      setCurrentUser(result.user || null);
      setAuthState("success");
      setMessage(`Signed in as ${result.user?.role || "user"}.`);
      resetDashboardState();
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect to the server.", "auth");
    }
  };

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) {
      setAuthState("error");
      setMessage("Enter your name, email, and password to create an account.");
      return;
    }

    setAuthState("loading");
    setMessage("");

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      setAuthState("success");
      setAuthMode("login");
      setForm((current) => ({ ...current, password: "" }));
      setMessage("Account created successfully. Sign in with your new credentials.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect to the server.", "auth");
    }
  };

  const getSummaryUsers = async (force = false) => {
    if (!canViewAdvancedSummary || (!force && summaryUsers.length)) {
      return;
    }

    setSummaryUsersState("loading");

    try {
      const result = await apiRequest("/dashboard/users");
      setSummaryUsers(result || []);
      setSummaryUsersState("success");
    } catch (error) {
      setErrorMessage(error.message || "Unable to fetch selectable users.", "summaryUsers");
    }
  };

  const getSummary = async (scopeOverride, userIdOverride) => {
    const nextScope = scopeOverride || summaryScope;
    const nextUserId = userIdOverride ?? selectedSummaryUserId;

    setSummaryState("loading");
    setRecordActionState("idle");
    setUserActionState("idle");
    setMessage("");

    if (nextScope === "user" && !nextUserId) {
      setSummaryState("idle");
      setMessage("Choose a user before loading a user-specific summary.");
      return;
    }

    const query = new URLSearchParams({ scope: nextScope });

    if (nextScope === "user") {
      query.set("userId", nextUserId);
    }

    try {
      const result = await apiRequest(`/dashboard/summary?${query.toString()}`);
      setData(result);
      setSummaryState("success");
      setMessage("Summary loaded successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to fetch summary.", "summary");
    }
  };

  const refreshActiveSummary = async () => {
    if (!token) {
      return;
    }

    await getSummary(summaryScope, selectedSummaryUserId);
  };

  const getRecords = async (filtersOverride) => {
    setRecordsState("loading");
    setRecordActionState("idle");
    setMessage("");

    try {
      const activeFilters = filtersOverride || recordFilters;
      const query = new URLSearchParams({ limit: "8" });

      if (activeFilters.search) {
        query.set("search", activeFilters.search);
      }

      if (activeFilters.type) {
        query.set("type", activeFilters.type);
      }

      if (activeFilters.category) {
        query.set("category", activeFilters.category);
      }

      if (activeFilters.startDate) {
        query.set("startDate", activeFilters.startDate);
      }

      if (activeFilters.endDate) {
        query.set("endDate", activeFilters.endDate);
      }

      const result = await apiRequest(`/records?${query.toString()}`);
      setRecords(result.data || []);
      setRecordsState("success");
      setMessage(`Loaded ${result.data?.length || 0} records. Scrolling to records section.`);
      scrollToRef(recordsSectionRef);
    } catch (error) {
      setErrorMessage(error.message || "Unable to fetch records.", "records");
    }
  };

  const getUsers = async () => {
    setUsersState("loading");
    setUserActionState("idle");
    setMessage("");

    try {
      const result = await apiRequest("/users");
      setUsers(result || []);
      setUsersState("success");
      setMessage(`Loaded ${result.length || 0} users. Scrolling to users section.`);
      scrollToRef(usersSectionRef);
    } catch (error) {
      setErrorMessage(error.message || "Unable to fetch users.", "users");
    }
  };

  const handleSummaryScopeChange = async (scope) => {
    setSummaryScope(scope);

    if (scope === "self" || scope === "overall") {
      setSelectedSummaryUserId("");
      await getSummary(scope, "");
      return;
    }

    await getSummaryUsers();
  };

  const handleCreateRecord = async () => {
    if (!recordDraft.amount || !recordDraft.category || !recordDraft.date) {
      setErrorMessage("Fill in amount, category, and date before creating a record.", "recordAction");
      return;
    }

    setRecordActionState("loading");
    setMessage("");

    try {
      await apiRequest(editingRecordId ? `/records/${editingRecordId}` : "/records", {
        method: editingRecordId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...recordDraft,
          amount: Number(recordDraft.amount)
        })
      });

      setRecordDraft(defaultRecordDraft);
      setEditingRecordId(null);
      await Promise.all([getRecords(), refreshActiveSummary()]);
      setSuccessMessage(
        editingRecordId ? "Record updated successfully." : "Record created successfully."
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to create the record.", "recordAction");
    }
  };

  const handleDeleteRecord = async (recordId) => {
    setRecordActionState("loading");
    setMessage("");

    try {
      await apiRequest(`/records/${recordId}`, {
        method: "DELETE"
      });

      await Promise.all([getRecords(), refreshActiveSummary()]);
      setSuccessMessage("Record deleted successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete the record.", "recordAction");
    }
  };

  const handleCreateUser = async () => {
    if (!userDraft.name || !userDraft.email || (!editingUserId && !userDraft.password)) {
      setErrorMessage("Fill in name, email, and password before creating a user.", "userAction");
      return;
    }

    setUserActionState("loading");
    setMessage("");

    try {
      const payload = editingUserId
        ? {
            name: userDraft.name,
            email: userDraft.email,
            role: userDraft.role,
            ...(userDraft.password ? { password: userDraft.password } : {})
          }
        : userDraft;

      await apiRequest(editingUserId ? `/users/${editingUserId}` : "/users", {
        method: editingUserId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      setUserDraft(defaultUserDraft);
      setEditingUserId(null);
      await Promise.all([getUsers(), getSummaryUsers(true)]);
      setSuccessMessage(editingUserId ? "User updated successfully." : "New user created successfully.");
    } catch (error) {
      setErrorMessage(error.message || "Unable to create the user.", "userAction");
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setUserActionState("loading");
    setMessage("");

    try {
      await apiRequest(`/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });

      await Promise.all([getUsers(), getSummaryUsers(true)]);
      setSuccessMessage(`${user.name} is now ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      setErrorMessage(error.message || "Unable to update the user status.", "userAction");
    }
  };

  const handleDeleteUser = async (user) => {
    setUserActionState("loading");
    setMessage("");

    try {
      await apiRequest(`/users/${user.id}`, {
        method: "DELETE"
      });

      if (String(selectedSummaryUserId) === String(user.id)) {
        setSelectedSummaryUserId("");
        setSummaryScope("self");
        await getSummary("self", "");
      }

      await Promise.all([getUsers(), getSummaryUsers(true)]);
      setSuccessMessage(`${user.name} was deleted successfully.`);
    } catch (error) {
      setErrorMessage(error.message || "Unable to delete the user.", "userAction");
    }
  };

  const startRecordEdit = (record) => {
    setEditingRecordId(record.id);
    setRecordDraft({
      amount: String(record.amount ?? ""),
      type: record.type || "EXPENSE",
      category: record.category || "",
      date: record.date || new Date().toISOString().slice(0, 10),
      notes: record.notes || ""
    });
    setMessage("Record loaded into the editor.");
  };

  const cancelRecordEdit = () => {
    setEditingRecordId(null);
    setRecordDraft(defaultRecordDraft);
    setMessage("Record editing cancelled.");
  };

  const startUserEdit = (user) => {
    setEditingUserId(user.id);
    setUserDraft({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "VIEWER"
    });
    setMessage("User loaded into the admin editor.");
    scrollToRef(userEditorSectionRef);
  };

  const cancelUserEdit = () => {
    setEditingUserId(null);
    setUserDraft(defaultUserDraft);
    setMessage("User editing cancelled.");
  };

  const resetRecordFilters = async () => {
    setRecordFilters(defaultRecordFilters);
    await getRecords(defaultRecordFilters);
  };

  const selectedSummaryUser = summaryUsers.find(
    (user) => String(user.id) === String(selectedSummaryUserId)
  );

  const isMessageError =
    authState === "error" ||
    summaryState === "error" ||
    recordsState === "error" ||
    usersState === "error" ||
    summaryUsersState === "error" ||
    recordActionState === "error" ||
    userActionState === "error";

  const handleLogout = () => {
    setToken("");
    setCurrentUser(null);
    resetDashboardState();
    setAuthState("idle");
    setAuthMode("login");
    setMessage("You have been logged out.");
  };

  useEffect(() => {
    if (!token || !currentUser) {
      return;
    }

    getSummary("self", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser]);

  useEffect(() => {
    if (!token || !currentUser || !canViewRecords) {
      return;
    }

    getRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUser, canViewRecords]);

  useEffect(() => {
    if (userRole === "ADMIN") {
      return;
    }

    setUsers([]);
    setUserDraft(defaultUserDraft);
    setEditingUserId(null);
    setUsersState("idle");
    setUserActionState("idle");
  }, [userRole]);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Personal finance cockpit</p>
          <h1>See your money flow in one calm, focused space.</h1>
          <p className="hero-text">
            Sign in or create an account to review your latest income,
            expenses, and balance without digging through spreadsheets or raw
            API responses.
          </p>

          {token && currentUser && (
            <div className="hero-stats" aria-label="product highlights">
              <div className="stat-pill">
                <span className="stat-value">{currentUser.role}</span>
                <span className="stat-label">active role</span>
              </div>
              <div className="stat-pill">
                <span className="stat-value">
                  {userRole === "VIEWER" ? "Own summary" : "Own + Overall + User"}
                </span>
                <span className="stat-label">summary scope</span>
              </div>
              <div className="stat-pill">
                <span className="stat-value">{currentUser.status}</span>
                <span className="stat-label">account status</span>
              </div>
            </div>
          )}
        </div>

        <div className="insight-card">
          <p className="insight-label">Current view</p>
          <h2>{token ? `${userRole} workspace` : "Authentication required"}</h2>
          <p>
            {token
              ? roleDescriptions[userRole]
              : authMode === "signup"
                ? "Create a user account with default viewer access, then sign in."
                : "Use your credentials to access the finance summary."}
          </p>
          <div className="capability-list">
            {(roleFeatureMap[userRole] || ["Sign in to inspect features"]).map((feature) => (
              <span key={feature} className="capability-pill">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={`workspace ${token ? "" : "workspace-single"}`.trim()}>
        <div className="panel auth-panel">
          <div className="panel-heading">
            <p className="eyebrow">Secure access</p>
            <h2>
              {token
                ? `Welcome, ${currentUser?.name?.split(" ")[0] || "User"}`
                : authMode === "signup"
                  ? "Create account"
                  : "Login"}
            </h2>
            <p>
              {token
                ? `${currentUser?.email} is signed in as ${userRole}.`
                : authMode === "signup"
                  ? "Anyone can sign up as a viewer. Only admins can create users with specific roles."
                  : "Connect to the backend to unlock your dashboard."}
            </p>
          </div>

          {!token ? (
            <>
              <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
                <button
                  className={`toggle-button ${authMode === "login" ? "toggle-button-active" : ""}`}
                  onClick={() => switchMode("login")}
                  type="button"
                >
                  Sign in
                </button>
                <button
                  className={`toggle-button ${authMode === "signup" ? "toggle-button-active" : ""}`}
                  onClick={() => switchMode("signup")}
                  type="button"
                >
                  Sign up
                </button>
              </div>

              <div className="form-grid">
                {authMode === "signup" && (
                  <label className="field">
                    <span>Name</span>
                    <input
                      placeholder="Your full name"
                      value={form.name}
                      onChange={handleChange("name")}
                    />
                  </label>
                )}

                <label className="field">
                  <span>Email</span>
                  <input
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange("email")}
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    placeholder={authMode === "signup" ? "Create a password" : "Enter password"}
                    type="password"
                    value={form.password}
                    onChange={handleChange("password")}
                  />
                </label>

                <button
                  className="primary-button"
                  onClick={authMode === "signup" ? handleSignup : handleLogin}
                  disabled={authState === "loading"}
                >
                  {authState === "loading"
                    ? authMode === "signup"
                      ? "Creating account..."
                      : "Signing in..."
                    : authMode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </button>
              </div>
            </>
          ) : (
            <div className="signed-in-state">
              <div className="status-badge">{userRole} session active</div>
              <p>{roleDescriptions[userRole]}</p>
              <div className="role-comparison-card">
                <strong>{userRole === "ADMIN" ? "Admin control room" : `${userRole} workflow`}</strong>
                <p>
                  {userRole === "ADMIN"
                    ? "You can actively change the system from this screen: create records, create users, and toggle account status."
                    : userRole === "ANALYST"
                      ? "You can compare users and audit records, but all controls stay read-only."
                      : "You can manage your own portfolio records here without touching anyone else's data."}
                </p>
              </div>
              {canViewAdvancedSummary && (
                <>
                  <div className="auth-toggle" role="tablist" aria-label="Summary scope">
                    <button
                      className={`toggle-button ${summaryScope === "self" ? "toggle-button-active" : ""}`}
                      onClick={() => handleSummaryScopeChange("self")}
                      type="button"
                    >
                      My summary
                    </button>
                    <button
                      className={`toggle-button ${summaryScope === "overall" ? "toggle-button-active" : ""}`}
                      onClick={() => handleSummaryScopeChange("overall")}
                      type="button"
                    >
                      Overall summary
                    </button>
                    <button
                      className={`toggle-button ${summaryScope === "user" ? "toggle-button-active" : ""}`}
                      onClick={() => handleSummaryScopeChange("user")}
                      type="button"
                    >
                      User summary
                    </button>
                  </div>

                  {summaryScope === "user" && (
                    <label className="field">
                      <span>Select user</span>
                      <select
                        className="select-input"
                        value={selectedSummaryUserId}
                        onChange={(event) => {
                          const nextUserId = event.target.value;
                          setSelectedSummaryUserId(nextUserId);

                          if (nextUserId) {
                            getSummary("user", nextUserId);
                          }
                        }}
                      >
                        <option value="">Choose a user</option>
                        {summaryUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}
              <div className="action-row">
                {canManageUsers && (
                  <button
                    className="secondary-button"
                    onClick={getUsers}
                    disabled={usersState === "loading"}
                    type="button"
                  >
                    {usersState === "loading" ? "Loading users..." : "View users"}
                  </button>
                )}

                <button
                  className="secondary-button"
                  onClick={handleLogout}
                  type="button"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={`message ${isMessageError ? "message-error" : "message-success"}`}>
              {message}
            </div>
          )}
        </div>

        {token && (
          <div className="panel dashboard-panel">
            <div className="panel-heading">
              <p className="eyebrow">Workspace</p>
              <h2>
                {userRole === "VIEWER"
                  ? "Summary dashboard"
                  : userRole === "ANALYST"
                    ? "Analyst dashboard"
                    : "Admin dashboard"}
              </h2>
              <p>
                {userRole === "VIEWER"
                  ? "You can inspect your own analytics and maintain your personal finance records."
                  : userRole === "ANALYST"
                    ? "You can compare users and audit records, but not change them."
                    : "You can compare users, audit records, and make live changes from this screen."}
              </p>
            </div>

            <div className="summary-footer summary-footer-inline">
              <p>
                Showing{" "}
                {summaryScope === "overall"
                  ? "overall system summary"
                  : summaryScope === "user"
                    ? `${selectedSummaryUser?.name || "selected user"} summary`
                    : "your personal summary"}
                .
              </p>
            </div>

            <div className="summary-grid">
              {cards.map((card) => (
                <article key={card.label} className={`summary-card ${card.tone}`}>
                  <p>{card.label}</p>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </div>

            {canManageRecords && (
              <section className="detail-section admin-control-grid">
                <article className="detail-card control-card">
                  <div className="detail-header">
                    <h3>{editingRecordId ? "Edit record" : userRole === "VIEWER" ? "Add my record" : "Create record"}</h3>
                    <span>{userRole === "VIEWER" ? "Your portfolio only" : "Admin only"}</span>
                  </div>
                  <div className="form-grid compact-grid">
                    <div className="field-row">
                      <label className="field">
                        <span>Amount</span>
                        <input
                          placeholder="15000"
                          type="number"
                          value={recordDraft.amount}
                          onChange={handleRecordDraftChange("amount")}
                        />
                      </label>
                      <label className="field">
                        <span>Type</span>
                        <select
                          className="select-input"
                          value={recordDraft.type}
                          onChange={handleRecordDraftChange("type")}
                        >
                          <option value="EXPENSE">Expense</option>
                          <option value="INCOME">Income</option>
                        </select>
                      </label>
                    </div>

                    <div className="field-row">
                      <label className="field">
                        <span>Category</span>
                        <input
                          placeholder="Consulting"
                          value={recordDraft.category}
                          onChange={handleRecordDraftChange("category")}
                        />
                      </label>
                      <label className="field">
                        <span>Date</span>
                        <input
                          type="date"
                          value={recordDraft.date}
                          onChange={handleRecordDraftChange("date")}
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span>Notes</span>
                      <textarea
                        placeholder="Optional description for this record"
                        value={recordDraft.notes}
                        onChange={handleRecordDraftChange("notes")}
                      />
                    </label>

                    <button
                      className="primary-button"
                      onClick={handleCreateRecord}
                      disabled={recordActionState === "loading"}
                      type="button"
                    >
                      {recordActionState === "loading"
                        ? editingRecordId
                          ? "Saving..."
                          : "Creating..."
                        : editingRecordId
                          ? "Save record"
                          : userRole === "VIEWER"
                            ? "Add record"
                            : "Create record"}
                    </button>
                    {editingRecordId && (
                      <button
                        className="secondary-button"
                        onClick={cancelRecordEdit}
                        type="button"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </article>
              </section>
            )}

            {canManageUsers && (
              <section className="detail-section" ref={userEditorSectionRef}>
                <article className="detail-card control-card">
                  <div className="detail-header">
                    <h3>{editingUserId ? "Edit user" : "Create user"}</h3>
                    <span>Admin only</span>
                  </div>
                  <div className="form-grid compact-grid">
                    <div className="field-row">
                      <label className="field">
                        <span>Name</span>
                        <input
                          placeholder="Priya Sharma"
                          value={userDraft.name}
                          onChange={handleUserDraftChange("name")}
                        />
                      </label>
                      <label className="field">
                        <span>Role</span>
                        <select
                          className="select-input"
                          value={userDraft.role}
                          onChange={handleUserDraftChange("role")}
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="ANALYST">Analyst</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </label>
                    </div>

                    <label className="field">
                      <span>Email</span>
                      <input
                        placeholder="new.user@example.com"
                        value={userDraft.email}
                        onChange={handleUserDraftChange("email")}
                      />
                    </label>

                    <label className="field">
                      <span>Password</span>
                      <input
                        type="password"
                        placeholder={editingUserId ? "Optional when editing" : "At least one letter and one number"}
                        value={userDraft.password}
                        onChange={handleUserDraftChange("password")}
                      />
                    </label>

                    <button
                      className="primary-button"
                      onClick={handleCreateUser}
                      disabled={userActionState === "loading"}
                      type="button"
                    >
                      {userActionState === "loading"
                        ? editingUserId
                          ? "Saving..."
                          : "Creating..."
                        : editingUserId
                          ? "Save user"
                          : "Create user"}
                    </button>
                    {editingUserId && (
                      <button
                        className="secondary-button"
                        onClick={cancelUserEdit}
                        type="button"
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </article>
              </section>
            )}

            <section className="detail-section">
              <div className="detail-header">
                <h3>Category totals</h3>
                <span>{data?.categoryTotals?.length || 0} categories</span>
              </div>
              {data?.categoryTotals?.length ? (
                <div className="detail-list detail-list-two">
                  {data.categoryTotals.map((item, index) => (
                    <article key={`${item.category}-${item.type}-${index}`} className="detail-card">
                      <strong>{item.category}</strong>
                      <p>{item.type}</p>
                      <span>{formatCurrency(item.totalAmount)}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="summary-footer">
                  <p>Choose a summary scope to inspect category-wise totals.</p>
                </div>
              )}
            </section>

            <section className="detail-section">
              <div className="detail-header">
                <h3>Recent activity</h3>
                <span>{data?.recentActivity?.length || 0} entries</span>
              </div>
              {data?.recentActivity?.length ? (
                <div className="detail-list">
                  {data.recentActivity.map((item) => (
                    <article key={item.id} className="detail-card">
                      <strong>{item.category}</strong>
                      <p>{item.type} - {formatCurrency(item.amount)}</p>
                      <span>{item.date}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="summary-footer">
                  <p>Recent activity will appear here after analytics load.</p>
                </div>
              )}
            </section>

            <section className="trend-grid">
              <div className="detail-section">
                <div className="detail-header">
                  <h3>Monthly trend</h3>
                  <span>{data?.monthlyTrend?.length || 0} entries</span>
                </div>
                {data?.monthlyTrend?.length ? (
                  <div className="detail-list">
                    {data.monthlyTrend.map((item, index) => (
                      <article key={`${item.month}-${item.type}-${index}`} className="detail-card">
                        <strong>{formatPeriodLabel(item.month)}</strong>
                        <p>{item.type}</p>
                        <span>{formatCurrency(item.totalAmount)}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="summary-footer">
                    <p>Monthly trend data will appear here after analytics load.</p>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <div className="detail-header">
                  <h3>Weekly trend</h3>
                  <span>{data?.weeklyTrend?.length || 0} entries</span>
                </div>
                {data?.weeklyTrend?.length ? (
                  <div className="detail-list">
                    {data.weeklyTrend.map((item, index) => (
                      <article key={`${item.date}-${item.type}-${index}`} className="detail-card">
                        <strong>{formatPeriodLabel(item.date)}</strong>
                        <p>{item.type}</p>
                        <span>{formatCurrency(item.totalAmount)}</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="summary-footer">
                    <p>Weekly trend data will appear here after analytics load.</p>
                  </div>
                )}
              </div>
            </section>

            {canViewRecords && (
              <section className="detail-section" ref={recordsSectionRef}>
                <div className="detail-header">
                  <h3>
                    {hasGlobalRecordAccess
                      ? "Record management"
                      : userRole === "VIEWER"
                        ? "My records"
                        : "Recent records"}
                  </h3>
                  <span>{records.length} loaded</span>
                </div>
                <div className="filter-panel">
                  <div className="filter-bar">
                    <input
                      className="filter-input"
                      placeholder="Search notes or category"
                      value={recordFilters.search}
                      onChange={handleRecordFilterChange("search")}
                    />
                    <select
                      className="select-input"
                      value={recordFilters.type}
                      onChange={handleRecordFilterChange("type")}
                    >
                      <option value="">All types</option>
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                    </select>
                    <input
                      className="filter-input"
                      placeholder="Filter by category"
                      value={recordFilters.category}
                      onChange={handleRecordFilterChange("category")}
                    />
                  </div>
                  <div className="filter-subbar">
                    <label className="field date-filter-field">
                      <span>Start date</span>
                      <div className="date-input-wrap">
                        <input
                          ref={startDateFilterRef}
                          className="filter-input"
                          type="date"
                          aria-label="Start date"
                          value={recordFilters.startDate}
                          onChange={handleRecordFilterChange("startDate")}
                        />
                        <button
                          className="date-picker-button"
                          onClick={() => openDatePicker(startDateFilterRef)}
                          type="button"
                          aria-label="Open start date calendar"
                        >
                          Pick
                        </button>
                      </div>
                    </label>
                    <label className="field date-filter-field">
                      <span>End date</span>
                      <div className="date-input-wrap">
                        <input
                          ref={endDateFilterRef}
                          className="filter-input"
                          type="date"
                          aria-label="End date"
                          value={recordFilters.endDate}
                          onChange={handleRecordFilterChange("endDate")}
                        />
                        <button
                          className="date-picker-button"
                          onClick={() => openDatePicker(endDateFilterRef)}
                          type="button"
                          aria-label="Open end date calendar"
                        >
                          Pick
                        </button>
                      </div>
                    </label>
                    <button
                      className="secondary-button"
                      onClick={() => getRecords()}
                      type="button"
                    >
                      Apply filters
                    </button>
                    <button
                      className="secondary-button"
                      onClick={resetRecordFilters}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="record-totals">
                  <article className="detail-card">
                    <strong>Filtered income</strong>
                    <span>{formatCurrency(filteredRecordTotals.income)}</span>
                  </article>
                  <article className="detail-card">
                    <strong>Filtered expense</strong>
                    <span>{formatCurrency(filteredRecordTotals.expense)}</span>
                  </article>
                  <article className="detail-card">
                    <strong>Filtered net</strong>
                    <span>
                      {formatCurrency(filteredRecordTotals.income - filteredRecordTotals.expense)}
                    </span>
                  </article>
                </div>
                {records.length ? (
                  <div className="detail-list">
                    {records.map((record) => (
                      <article key={record.id} className="detail-card detail-card-highlight">
                        <strong>{record.category}</strong>
                        <p>{record.type} - {formatCurrency(record.amount)}</p>
                        <span>
                          {record.owner?.name || "Unknown owner"} - {record.owner?.role || "No role"}
                        </span>
                        <span>{record.date}</span>
                        {canManageRecords && (
                          <div className="detail-actions">
                            <button
                              className="mini-button"
                              onClick={() => startRecordEdit(record)}
                              type="button"
                            >
                              Edit record
                            </button>
                            <button
                              className="mini-button mini-button-danger"
                              onClick={() => handleDeleteRecord(record.id)}
                              type="button"
                            >
                              {userRole === "VIEWER" ? "Delete mine" : "Delete record"}
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="summary-footer">
                    <p>No records loaded yet.</p>
                  </div>
                )}
              </section>
            )}

            {canManageUsers && (
              <section className="detail-section" ref={usersSectionRef}>
                <div className="detail-header">
                  <h3>User access</h3>
                  <span>{users.length} loaded</span>
                </div>
                {users.length ? (
                  <div className="detail-list">
                    {users.map((user) => (
                      <article key={user.id} className="detail-card detail-card-highlight">
                        <strong>{user.name}</strong>
                        <p>{user.role} - {user.status}</p>
                        <span>{user.email}</span>
                        <div className="detail-actions">
                          <button
                            className="mini-button"
                            onClick={() => startUserEdit(user)}
                            type="button"
                          >
                            Edit user
                          </button>
                          <button
                            className="mini-button"
                            onClick={() => handleToggleUserStatus(user)}
                            type="button"
                          >
                            Mark as {user.status === "ACTIVE" ? "inactive" : "active"}
                          </button>
                          <button
                            className="mini-button mini-button-danger"
                            onClick={() => handleDeleteUser(user)}
                            type="button"
                          >
                            Delete user
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="summary-footer">
                    <p>Admins can load and review all user accounts from here.</p>
                  </div>
                )}
              </section>
            )}

            {!data && (
              <div className="summary-footer">
                <p>Choose a summary scope. Analytics will load automatically when the scope changes.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./SystemAdmin.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyForm = {
  userId: "",
  name: "",
  phone: "",
  password: "",
  isAdmin: false,
  // canRead: false,   // Read/Write feature currently disabled
  // canWrite: false,  // Read/Write feature currently disabled
};

const emptyEditForm = {
  name: "",
  phone: "",
  password: "",
  isAdmin: false,
  // canRead: false,   // Read/Write feature currently disabled
  // canWrite: false,  // Read/Write feature currently disabled
};

function SystemAdmin() {
  const navigate = useNavigate();

  const [checking, setChecking]         = useState(true);
  const [adminExists, setAdminExists]   = useState(false);

  const storedUser   = localStorage.getItem("user");
  const currentUser  = storedUser ? JSON.parse(storedUser) : null;
  const token        = localStorage.getItem("token");

  const [form, setForm]         = useState(emptyForm);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);

  const [users, setUsers]           = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Editing state — only ever used by admins, since this whole page is
  // already gated to admins below (Step 2), and the backend routes
  // independently enforce requireAdmin as well.
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm]           = useState(emptyEditForm);
  const [editLoading, setEditLoading]     = useState(false);

  // Step 0: figure out whether the one-time setup screen should show.
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await axios.get(`${API}/api/auth/admin-exists`);
        setAdminExists(res.data.exists);
      } catch (err) {
        setError("Could not reach the server. Please try again.");
      } finally {
        setChecking(false);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (adminExists && currentUser?.isAdmin) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminExists]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.users);
    } catch (err) {
      // table just stays empty if this fails
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Admin always gets full access — force read/write on and lock them.
    // Read/Write feature currently disabled, keeping the isAdmin
    // toggle itself active but no longer touching canRead/canWrite.
    // if (name === "isAdmin") {
    //   setForm((f) => ({
    //     ...f,
    //     isAdmin: checked,
    //     canRead: checked ? true : f.canRead,
    //     canWrite: checked ? true : f.canWrite,
    //   }));
    //   return;
    // }

    if (name === "isAdmin") {
      setForm((f) => ({ ...f, isAdmin: checked }));
      return;
    }

    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setSuccess("");
  };

  const handleCreateFirstAdmin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const { userId, name, phone, password } = form;
    if (!userId || !name || !phone || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/create-first-admin`, {
        userId, name, phone, password,
      });
      setSuccess("Admin account created. Please sign in to continue.");
      setAdminExists(true);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const { userId, name, phone, password } = form;
    if (!userId || !name || !phone || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/add-user`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("User created successfully.");
      resetForm();
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Edit user (admin-only) ───────────────────────────────────────
  const startEditUser = (u) => {
    setError("");
    setSuccess("");
    setShowAddForm(false);
    setEditingUserId(u._id);
    setEditForm({
      name: u.name || "",
      phone: u.phone || "",
      password: "",
      isAdmin: !!u.isAdmin,
      // canRead: !!u.canRead,   // Read/Write feature currently disabled
      // canWrite: !!u.canWrite, // Read/Write feature currently disabled
    });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditForm(emptyEditForm);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Read/Write feature currently disabled — isAdmin no longer forces
    // canRead/canWrite on here either.
    // if (name === "isAdmin") {
    //   setEditForm((f) => ({
    //     ...f,
    //     isAdmin: checked,
    //     canRead: checked ? true : f.canRead,
    //     canWrite: checked ? true : f.canWrite,
    //   }));
    //   return;
    // }

    if (name === "isAdmin") {
      setEditForm((f) => ({ ...f, isAdmin: checked }));
      return;
    }

    setEditForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleUpdateUser = async (e, userId) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editForm.name || !editForm.phone) {
      setError("Name and phone are required.");
      return;
    }

    setEditLoading(true);
    try {
      await axios.put(`${API}/api/auth/users/${userId}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("User updated successfully.");
      cancelEditUser();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete user (admin-only) ─────────────────────────────────────
  const handleDeleteUser = async (u) => {
    setError("");
    setSuccess("");

    const confirmed = window.confirm(
      `Delete user "${u.name}" (${u.userId})? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`${API}/api/auth/users/${u._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess("User deleted successfully.");
      if (editingUserId === u._id) cancelEditUser();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    }
  };

  if (checking) {
    return (
      <div className="sysadmin-page">
        <p>Checking setup status…</p>
      </div>
    );
  }

  // ── STEP 1: no admin exists anywhere yet — one-time setup screen ────
  if (!adminExists) {
    return (
      <div className="sysadmin-page">
        <button type="button" className="sysadmin-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="sysadmin-card sysadmin-card-narrow">
          <h2>Create the First Admin</h2>
          <p className="sysadmin-sub">
            This screen only runs once. As soon as this admin is created,
            it locks itself for good.
          </p>

          {error && <div className="sysadmin-alert error">{error}</div>}
          {success && <div className="sysadmin-alert success">{success}</div>}

          {!success && (
            <form onSubmit={handleCreateFirstAdmin} className="sysadmin-form sysadmin-form-stacked">
              <div className="input-group">
                <label>User ID</label>
                <input name="userId" value={form.userId} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Name</label>
                <input name="name" value={form.name} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} />
              </div>
              <div className="checkbox-row">
                <input type="checkbox" checked readOnly />
                <label>Is Admin (locked — the first account is always the admin)</label>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create Admin"}
              </button>
            </form>
          )}

          {success && (
            <p className="sysadmin-sub">
              <Link to="/signin">Go to Sign In →</Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 2: an admin already exists — gate the page ──────────────────
  if (!currentUser || !currentUser.isAdmin) {
    return (
      <div className="sysadmin-page">
        <button type="button" className="sysadmin-back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="sysadmin-card sysadmin-card-narrow">
          <h2>Access Denied</h2>
          <p className="sysadmin-sub">
            You need an admin account to view this page.
          </p>
          <Link to="/signin">Sign in →</Link>
        </div>
      </div>
    );
  }

  // ── STEP 3: admin dashboard ────────────────────────────────────────
  return (
    <div className="sysadmin-page">
      <button type="button" className="sysadmin-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="sysadmin-card">
        <div className="sysadmin-card-header">
          <div className="sysadmin-card-title">
            <span className="sysadmin-card-icon">⟳</span>
            <h2>System Users</h2>
          </div>

          <span className="sysadmin-badge">Total Users: {users.length}</span>

          <button
            type="button"
            className="sysadmin-add-row-btn sysadmin-add-row-btn-header"
            onClick={() => {
              setShowAddForm((s) => !s);
              cancelEditUser();
              resetForm();
            }}
          >
            {showAddForm ? "Cancel" : "+ Add User"}
          </button>
        </div>

        {error && <div className="sysadmin-alert error">{error}</div>}
        {success && <div className="sysadmin-alert success">{success}</div>}

        {showAddForm && (
          <form onSubmit={handleAddUser}>
            <div className="sysadmin-inline-form-wrap">
              <table className="sysadmin-inline-table">
                <thead>
                  <tr>
                    <th>S No</th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Password</th>
                    <th>Admin</th>
                    {/* <th>Read</th>  Read/Write feature currently disabled */}
                    {/* <th>Write</th> Read/Write feature currently disabled */}
                    <th>Del</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="sysadmin-sno">1</td>
                    <td>
                      <input
                        type="text"
                        name="userId"
                        placeholder="User ID..."
                        value={form.userId}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="name"
                        placeholder="Full name..."
                        value={form.name}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="phone"
                        placeholder="Phone..."
                        value={form.phone}
                        onChange={handleChange}
                      />
                    </td>
                    <td>
                      <input
                        type="password"
                        name="password"
                        placeholder="Password..."
                        value={form.password}
                        onChange={handleChange}
                      />
                    </td>
                    <td className="sysadmin-checkbox-cell">
                      <input
                        type="checkbox"
                        name="isAdmin"
                        checked={form.isAdmin}
                        onChange={handleChange}
                      />
                    </td>
                    {/* Read/Write feature currently disabled
                    <td className="sysadmin-checkbox-cell">
                      <input
                        type="checkbox"
                        name="canRead"
                        checked={form.canRead}
                        disabled={form.isAdmin}
                        onChange={handleChange}
                      />
                    </td>
                    <td className="sysadmin-checkbox-cell">
                      <input
                        type="checkbox"
                        name="canWrite"
                        checked={form.canWrite}
                        disabled={form.isAdmin}
                        onChange={handleChange}
                      />
                    </td>
                    */}
                    <td>
                      <button
                        type="button"
                        className="sysadmin-del-btn"
                        onClick={() => {
                          setShowAddForm(false);
                          resetForm();
                        }}
                        title="Cancel this row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cancel sits on the LEFT (secondary action), +Add User sits
                on the RIGHT (primary action). */}
            <div className="sysadmin-inline-actions">
              <button
                type="button"
                className="sysadmin-cancel-btn"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button type="submit" className="sysadmin-add-row-btn" disabled={loading}>
                {loading ? "Adding…" : "+ Add User"}
              </button>
            </div>
          </form>
        )}

        <table className="sysadmin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Admin</th>
              {/* <th>Read</th>  Read/Write feature currently disabled */}
              {/* <th>Write</th> Read/Write feature currently disabled */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isEditing = editingUserId === u._id;

              if (isEditing) {
                return (
                  <tr key={u._id} className="sysadmin-edit-row">
                    {/* colSpan was 7 when Read/Write columns were shown;
                        now 5 visible columns (User ID, Name, Phone, Admin, Actions) */}
                    <td colSpan={5}>
                      <form
                        onSubmit={(e) => handleUpdateUser(e, u._id)}
                        className="sysadmin-edit-form"
                      >
                        <div className="sysadmin-edit-grid">
                          <div className="sysadmin-edit-field">
                            <label>User ID</label>
                            <input type="text" value={u.userId} disabled />
                          </div>
                          <div className="sysadmin-edit-field">
                            <label>Name</label>
                            <input
                              type="text"
                              name="name"
                              value={editForm.name}
                              onChange={handleEditChange}
                            />
                          </div>
                          <div className="sysadmin-edit-field">
                            <label>Phone</label>
                            <input
                              type="text"
                              name="phone"
                              value={editForm.phone}
                              onChange={handleEditChange}
                            />
                          </div>
                          <div className="sysadmin-edit-field">
                            <label>New Password</label>
                            <input
                              type="password"
                              name="password"
                              placeholder="Leave blank to keep current"
                              value={editForm.password}
                              onChange={handleEditChange}
                            />
                          </div>
                          <div className="sysadmin-edit-field sysadmin-edit-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                name="isAdmin"
                                checked={editForm.isAdmin}
                                onChange={handleEditChange}
                              />
                              Admin
                            </label>
                          </div>
                          {/* Read/Write feature currently disabled
                          <div className="sysadmin-edit-field sysadmin-edit-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                name="canRead"
                                checked={editForm.canRead}
                                disabled={editForm.isAdmin}
                                onChange={handleEditChange}
                              />
                              Read
                            </label>
                          </div>
                          <div className="sysadmin-edit-field sysadmin-edit-checkbox">
                            <label>
                              <input
                                type="checkbox"
                                name="canWrite"
                                checked={editForm.canWrite}
                                disabled={editForm.isAdmin}
                                onChange={handleEditChange}
                              />
                              Write
                            </label>
                          </div>
                          */}
                        </div>

                        <div className="sysadmin-edit-actions">
                          <button
                            type="button"
                            className="sysadmin-cancel-btn"
                            onClick={cancelEditUser}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="sysadmin-add-row-btn"
                            disabled={editLoading}
                          >
                            {editLoading ? "Saving…" : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={u._id}>
                  <td>{u.userId || "—"}</td>
                  <td>{u.name}</td>
                  <td>{u.phone || "—"}</td>
                  <td>{u.isAdmin ? "✓" : ""}</td>
                  {/* <td>{u.canRead ? "✓" : ""}</td>  Read/Write feature currently disabled */}
                  {/* <td>{u.canWrite ? "✓" : ""}</td> Read/Write feature currently disabled */}
                  <td className="sysadmin-actions-cell">
                    {/* Only admins ever reach this dashboard (Step 2 above
                        gates non-admins), and the backend independently
                        enforces requireAdmin on both routes below. */}
                    <button
                      type="button"
                      className="sysadmin-edit-btn"
                      onClick={() => startEditUser(u)}
                      title="Edit user"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="sysadmin-del-btn sysadmin-del-btn-row"
                      onClick={() => handleDeleteUser(u)}
                      title="Delete user"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SystemAdmin;
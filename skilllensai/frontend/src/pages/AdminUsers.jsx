import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AdminShell from "../components/AdminShell";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("adminToken");
  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  useEffect(() => {
    const fetchUsers = async () => {
      setErr("");
      setLoading(true);
      try {
        const res = await api.get("/admin/users", authHeader);
        setUsers(res.data.data || res.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      (u.fullName || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term) ||
      (u.username || "").toLowerCase().includes(term)
    );
  });

  return (
    <AdminShell active="users">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse and search all learner accounts registered on SkillLens AI.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {users.length} total · {filtered.length} shown
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or username"
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="py-2 pl-4 pr-4 font-medium">Student</th>
              <th className="py-2 pr-4 font-medium">Username</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u._id} className="border-b border-slate-50">
                <td className="py-2 pl-4 pr-4">
                  <div className="text-xs font-medium text-slate-900">
                    {u.fullName || "—"}
                  </div>
                </td>
                <td className="py-2 pr-4 text-[11px] text-slate-600">
                  {u.username || "—"}
                </td>
                <td className="py-2 pr-4 text-[11px] text-slate-600">
                  {u.email}
                </td>
                <td className="py-2 pr-4 text-[11px] text-slate-500">
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-xs text-slate-500"
                >
                  No students match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="mt-4 text-center text-xs text-slate-400">
          Loading students…
        </div>
      )}
    </AdminShell>
  );
};

export default AdminUsers;


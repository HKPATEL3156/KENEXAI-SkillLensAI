import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AdminShell from "../components/AdminShell";

const statusLabel = (status) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";

const StatusBadge = ({ status }) => {
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${tone}`}>
      {statusLabel(status)}
    </span>
  );
};

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const token = localStorage.getItem("adminToken");
  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const fetchCompanies = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/admin/company-requests", authHeader);
      setCompanies(res.data.data || res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const approve = async (id) => {
    try {
      await api.post(`/admin/company-requests/${id}/approve`, null, authHeader);
      fetchCompanies();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  const filtered = companies.filter((c) =>
    filter === "all" ? true : c.status === filter,
  );

  const pendingCount = companies.filter((c) => c.status === "pending").length;
  const approvedCount = companies.filter((c) => c.status === "approved").length;
  const rejectedCount = companies.filter((c) => c.status === "rejected").length;

  const buildDocumentUrl = (company) => {
    if (!company?.documentPath) return null;
    // documentPath is served by the backend at http://localhost:5000/uploads/...
    // Use absolute URL so it works from the Vite dev server.
    const base =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    return `${base}${company.documentPath}`;
  };

  return (
    <AdminShell active="companies">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and manage hiring partners requesting access to SkillLens
            AI.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {companies.length} total · {pendingCount} pending · {approvedCount}{" "}
          approved · {rejectedCount} rejected
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={`rounded-full border px-3 py-1 ${
              filter === opt.key
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="py-2 pl-4 pr-4 font-medium">Company</th>
              <th className="py-2 pr-4 font-medium">Contact</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c._id} className="border-b border-slate-50">
                <td className="py-2 pl-4 pr-4">
                  <div className="text-xs font-medium text-slate-900">
                    {c.companyName}
                  </div>
                  <div className="text-[11px] text-slate-500">{c.email}</div>
                </td>
                <td className="py-2 pr-4 text-[11px] text-slate-600">
                  {c.contactName || "—"}
                  {c.contactPhone && ` · ${c.contactPhone}`}
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="py-2 pr-4 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelected(c)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </button>
                  {c.status === "pending" && (
                    <button
                      onClick={() => approve(c._id)}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="py-4 text-center text-xs text-slate-500"
                >
                  No companies in this state.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="mt-4 text-center text-xs text-slate-400">
          Loading companies…
        </div>
      )}

      {/* Detail modal card */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selected.companyName}
                </h2>
                <p className="text-xs text-slate-500">{selected.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">Status</span>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium text-slate-800">Contact name</div>
                  <div>{selected.contactName || "—"}</div>
                </div>
                <div>
                  <div className="font-medium text-slate-800">Contact phone</div>
                  <div>{selected.contactPhone || "—"}</div>
                </div>
              </div>

              {selected.address && (
                <div>
                  <div className="font-medium text-slate-800">Address</div>
                  <div className="leading-snug">
                    {selected.address.street && (
                      <>
                        {selected.address.street}
                        <br />
                      </>
                    )}
                    {(selected.address.city || selected.address.state) && (
                      <>
                        {selected.address.city}
                        {selected.address.city && selected.address.state
                          ? ", "
                          : ""}
                        {selected.address.state}
                        <br />
                      </>
                    )}
                    {(selected.address.postalCode ||
                      selected.address.country) && (
                      <>
                        {selected.address.postalCode}{" "}
                        {selected.address.country}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-medium text-slate-800">Created</div>
                  <div>
                    {selected.createdAt
                      ? new Date(selected.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-800">Last updated</div>
                  <div>
                    {selected.updatedAt
                      ? new Date(selected.updatedAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>

              {buildDocumentUrl(selected) ? (
                <div>
                  <div className="font-medium text-slate-800">Documents</div>
                  <a
                    href={buildDocumentUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center rounded-full bg-indigo-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700"
                  >
                    Download registration document
                  </a>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  No document uploaded with this request.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default AdminCompanies;


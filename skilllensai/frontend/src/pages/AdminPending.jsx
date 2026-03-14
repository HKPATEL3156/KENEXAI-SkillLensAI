import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AdminShell from "../components/AdminShell";

const StatusBadge = ({ status }) => {
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${tone}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

const AdminPending = () => {
  const [companies, setCompanies] = useState([]);
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
      setCompanies(
        (res.data.data || res.data || []).filter(
          (c) => c.status === "pending",
        ),
      );
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

  const reject = async (id) => {
    try {
      await api.post(`/admin/company-requests/${id}/reject`, null, authHeader);
      fetchCompanies();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  const pendingCount = companies.length;

  const buildDocumentUrl = (company) => {
    if (!company?.documentPath) return null;
    const base =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    return `${base}${company.documentPath}`;
  };

  return (
    <AdminShell active="pending" pendingCount={pendingCount}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pending approvals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {pendingCount} companies awaiting your review. Approve or reject
            each registration.
          </p>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      <section className="space-y-3">
        {companies.map((c) => (
          <div
            key={c._id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                  {(c.companyName || "C")
                    .split(" ")
                    .map((x) => x[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {c.companyName}
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-slate-500">{c.email}</div>
                  <div className="text-slate-500">
                    Registered:{" "}
                    {c.createdAt
                      ? new Date(c.createdAt).toLocaleString()
                      : "—"}
                  </div>
                  {c.address && (
                    <div>
                      Location:{" "}
                      {[
                        c.address.city,
                        c.address.state,
                        c.address.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  View details
                </button>
                <button
                  type="button"
                  onClick={() => approve(c._id)}
                  className="rounded-full bg-emerald-600 px-4 py-1.5 font-medium text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => reject(c._id)}
                  className="rounded-full border border-slate-200 px-4 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}

        {pendingCount === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            No companies are awaiting approval right now.
          </div>
        )}
      </section>

      {loading && (
        <div className="mt-4 text-center text-xs text-slate-400">
          Loading pending approvals…
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
                  <div className="font-medium text-slate-800">Registered</div>
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

              <div>
                <div className="font-medium text-slate-800">Documents</div>
                {buildDocumentUrl(selected) ? (
                  <a
                    href={buildDocumentUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center rounded-full bg-indigo-600 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-indigo-700"
                  >
                    Download registration document
                  </a>
                ) : (
                  <div className="mt-1 text-xs text-slate-400">
                    Document not submitted.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

export default AdminPending;


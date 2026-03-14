import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AdminShell from "../components/AdminShell";

const StatCard = ({ label, value, subtitle, tone = "default" }) => {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
      : tone === "warning"
      ? "bg-amber-50 text-amber-800 border-amber-100"
      : "bg-slate-50 text-slate-800 border-slate-100";

  return (
    <div
      className={`rounded-2xl border px-5 py-4 shadow-sm flex flex-col justify-between ${toneClasses}`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      )}
    </div>
  );
};

const Badge = ({ children, tone = "default" }) => {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs";
  const variant =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-100 text-slate-700";
  return <span className={`${base} ${variant}`}>{children}</span>;
};

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("adminToken");

  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const fetchAll = async () => {
    setErr("");
    setLoading(true);
    try {
      const [usersRes, reqRes, summaryRes] = await Promise.all([
        api.get("/admin/users", authHeader),
        api.get("/admin/company-requests", authHeader),
        api.get("/admin/summary", authHeader),
      ]);

      setUsers(usersRes.data.data || usersRes.data || []);
      setRequests(reqRes.data.data || reqRes.data || []);
      setSummary(summaryRes.data || null);
    } catch (err) {
      setErr(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const approve = async (id) => {
    try {
      await api.post(
        `/admin/company-requests/${id}/approve`,
        null,
        authHeader,
      );
      fetchAll();
    } catch (err) {
      setErr(err?.response?.data?.message || err.message);
    }
  };

  const pendingCompanies = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );
  const approvedCompanies = useMemo(
    () => requests.filter((r) => r.status === "approved"),
    [requests],
  );

  const topPerformers = summary?.quiz?.topPerformers || [];

  const totalCompanies = summary?.totals?.companies ?? requests.length;
  const pendingCount = pendingCompanies.length;

  return (
    <AdminShell active="dashboard" pendingCount={pendingCount}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Snapshot of companies, candidates, and quiz performance across
            SkillLens AI.
          </p>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Top stats row */}
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total companies"
          value={totalCompanies}
          subtitle="All registered hiring partners"
        />
        <StatCard
          label="Pending approval"
          value={pendingCount}
          subtitle="Awaiting your review"
          tone="warning"
        />
        <StatCard
          label="Total candidates"
          value={summary?.totals?.users ?? users.length}
          subtitle="Registered learner profiles"
        />
        <StatCard
          label="Total quiz attempts"
          value={summary?.quiz?.totalAttempts ?? 0}
          subtitle={`Avg quiz score ${
            summary?.quiz?.averageScorePercent ?? 0
          }%`}
        />
      </section>

      {/* Recent companies + platform activity */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent company registrations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent company registrations
              </h2>
              <p className="text-xs text-slate-500">
                Latest companies requesting access to recruit via SkillLens AI.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {requests.slice(0, 5).map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {(c.companyName || "C")
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-900">
                      {c.companyName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.email}
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <Badge
                    tone={
                      c.status === "approved"
                        ? "success"
                        : c.status === "rejected"
                        ? "danger"
                        : "default"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No company registrations yet.
              </div>
            )}
          </div>
        </div>

        {/* Platform activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Platform activity
            </h2>
            <p className="text-xs text-slate-500">
              Engagement trends based on quiz usage.
            </p>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Quizzes taken</span>
              <span className="font-semibold">
                {summary?.quiz?.totalAttempts ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg quiz score</span>
              <span className="font-semibold">
                {summary?.quiz?.averageScorePercent ?? 0}%
              </span>
            </div>
            <div className="pt-2">
              <div className="mb-1 text-xs font-medium text-slate-800">
                Top performing candidates
              </div>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {topPerformers.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
              >
                <div>
                  <div className="text-xs font-medium text-slate-900">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-slate-500">{p.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900">
                    {p.scorePercent}%
                  </div>
                  <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${p.scorePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {topPerformers.length === 0 && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No submitted quiz attempts yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Company onboarding status + quick actions */}
      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Company onboarding status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Company onboarding status
            </h2>
            <p className="text-xs text-slate-500">
              Track pending vs approved hiring partners.
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Approved companies</span>
              <span className="font-semibold">{approvedCompanies.length}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width:
                    totalCompanies && approvedCompanies.length
                      ? `${Math.round(
                          (approvedCompanies.length / totalCompanies) * 100,
                        )}%`
                      : "0%",
                }}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span>Pending review</span>
              <span className="font-semibold">{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Quick actions
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Jump directly to the most common admin workflows.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/pending"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Review pending ({pendingCount})
            </a>
            <a
              href="/admin/companies"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              View all companies
            </a>
            <a
              href="/admin/users"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              View all candidates
            </a>
          </div>
        </div>
      </section>

      {/* Existing detailed lists */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Company onboarding requests
              </h2>
              <span className="text-xs text-slate-500">
                {requests.length} total · {pendingCompanies.length} pending
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Company</th>
                    <th className="py-2 pr-4">Contact</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id} className="border-b border-slate-50">
                      <td className="py-2 pr-4">
                        <div className="text-xs font-medium text-slate-900">
                          {r.companyName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {r.email}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-[11px] text-slate-600">
                        {r.contactName || "—"}
                        {r.contactPhone && ` · ${r.contactPhone}`}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          tone={
                            r.status === "approved"
                              ? "success"
                              : r.status === "rejected"
                              ? "danger"
                              : "default"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-0 text-right">
                        {r.status !== "approved" && (
                          <button
                            onClick={() => approve(r._id)}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-xs text-slate-500"
                      >
                        No company onboarding requests yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent users */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent student signups
              </h2>
              <span className="text-xs text-slate-500">
                {users.length} total users
              </span>
            </div>
            <div className="space-y-2">
              {users.slice(0, 8).map((u) => (
                <div
                  key={u._id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-900">
                      {u.fullName || u.email}
                      {u.username && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          · {u.username}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(u.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">Student</span>
                </div>
              ))}
              {users.length === 0 && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  No students have signed up yet.
                </div>
              )}
            </div>
          </section>

        {loading && (
          <div className="mt-4 text-center text-xs text-slate-400">
            Loading latest metrics…
          </div>
        )}
    </AdminShell>
  );
};

export default AdminDashboard;

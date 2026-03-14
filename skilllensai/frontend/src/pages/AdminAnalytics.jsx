import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AdminShell from "../components/AdminShell";

const BarRow = ({ label, value, total }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>
          {value} · {percent}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("adminToken");
  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  useEffect(() => {
    const fetchSummary = async () => {
      setErr("");
      setLoading(true);
      try {
        const res = await api.get("/admin/summary", authHeader);
        setSummary(res.data || null);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const totalAttempts = summary?.quiz?.totalAttempts || 0;
  const dist = summary?.quiz?.scoreDistribution || {};
  const topSkills = summary?.quiz?.topSkills || [];

  return (
    <AdminShell active="analytics">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            High-level insights into quiz performance and skill trends across
            students.
          </p>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Score distribution
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Submitted quiz attempts grouped by overall score range.
          </p>
          <div className="space-y-3">
            <BarRow
              label="90–100%"
              value={dist["90_100"] || 0}
              total={totalAttempts}
            />
            <BarRow
              label="75–90%"
              value={dist["75_90"] || 0}
              total={totalAttempts}
            />
            <BarRow
              label="60–75%"
              value={dist["60_75"] || 0}
              total={totalAttempts}
            />
            <BarRow
              label="Below 60%"
              value={dist["0_60"] || 0}
              total={totalAttempts}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            Top skills among applicants
          </h2>
          <p className="mb-4 text-xs text-slate-500">
            Most frequently targeted skills across quiz attempts.
          </p>
          <div className="space-y-3">
            {topSkills.map((s) => (
              <BarRow
                key={s.name}
                label={s.name}
                value={s.count}
                total={topSkills.reduce((sum, x) => sum + x.count, 0)}
              />
            ))}
            {topSkills.length === 0 && !loading && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No quiz attempts with skill tagging yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {loading && (
        <div className="mt-4 text-center text-xs text-slate-400">
          Loading analytics…
        </div>
      )}
    </AdminShell>
  );
};

export default AdminAnalytics;


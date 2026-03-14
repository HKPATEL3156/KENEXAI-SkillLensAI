import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import { getCompanyStats } from "../services/api";

const CompanyAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) { nav("/company/login"); return; }

    const load = async () => {
      setLoading(true);
      try {
        const res = await getCompanyStats();
        setStats(res.data);
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          nav("/company/login");
        } else {
          setErr(e?.response?.data?.message || e.message);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nav]);

  const topPerformers = stats?.topPerformers || [];
  const avgScore = stats?.avgScore ?? 0;
  const totalAttempts = stats?.totalAttempts ?? 0;
  const totalCandidates = stats?.totalCandidates ?? 0;

  return (
    <CompanyShell active="analytics">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Performance metrics and insights from the talent pool.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading analytics…</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Candidates</div>
              <div className="text-2xl font-bold text-slate-900">{totalCandidates}</div>
              <div className="text-xs text-slate-400 mt-1">Registered on platform</div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Quiz Submissions</div>
              <div className="text-2xl font-bold text-slate-900">{totalAttempts}</div>
              <div className="text-xs text-slate-400 mt-1">Assessment attempts</div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Quiz Score</div>
              <div className="text-2xl font-bold text-slate-900">{avgScore}%</div>
              <div className="text-xs text-slate-400 mt-1">Platform average</div>
            </div>
          </div>

          {/* Avg score bar */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Score Distribution</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Platform average</span>
                  <span className="font-medium text-slate-900">{avgScore}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(100, avgScore)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top performers table */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Top Performing Candidates</h2>
              <p className="text-xs text-slate-500 mt-0.5">Highest quiz scores</p>
            </div>
            <div className="overflow-x-auto">
              {topPerformers.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No quiz submissions yet.</div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="py-3 pl-5 pr-4 font-medium">#</th>
                      <th className="py-3 pr-4 font-medium">Name</th>
                      <th className="py-3 pr-4 font-medium">Email</th>
                      <th className="py-3 pr-4 font-medium">Quiz</th>
                      <th className="py-3 pr-5 font-medium text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topPerformers.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 pl-5 pr-4 font-medium text-slate-700">{i + 1}</td>
                        <td className="py-3 pr-4 text-slate-900">{p.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{p.email}</td>
                        <td className="py-3 pr-4 text-slate-600">{p.quizName || "—"}</td>
                        <td className="py-3 pr-5 text-right font-semibold text-indigo-600">{p.scorePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyShell>
  );
};

export default CompanyAnalytics;

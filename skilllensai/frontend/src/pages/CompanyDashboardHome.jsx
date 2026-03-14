import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import { getCompanyStats, getCompanyProfile } from "../services/api";

const StatCard = ({ label, value, sub, color = "indigo" }) => {
  const colors = {
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
        <div className="w-5 h-5 bg-white/30 rounded" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value ?? "—"}</div>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
};

const ScoreBar = ({ percent }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 mt-1">
    <div
      className="h-full rounded-full bg-indigo-500 transition-all"
      style={{ width: `${percent}%` }}
    />
  </div>
);

const CompanyDashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) { nav("/company/login"); return; }

    const load = async () => {
      setLoading(true);
      try {
        const [sRes, pRes] = await Promise.all([getCompanyStats(), getCompanyProfile()]);
        setStats(sRes.data);
        setProfile(pRes.data.company);
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

  return (
    <CompanyShell active="dashboard">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {profile?.companyName || "Company"} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here's a snapshot of the talent pool and quiz performance on SkillLens AI.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Candidates"
          value={stats?.totalCandidates}
          sub="Registered on platform"
          color="indigo"
        />
        <StatCard
          label="Quiz Attempts"
          value={stats?.totalAttempts}
          sub="Submitted assessments"
          color="emerald"
        />
        <StatCard
          label="Avg Quiz Score"
          value={stats?.avgScore != null ? `${stats.avgScore}%` : "—"}
          sub="Across all submissions"
          color="amber"
        />
        <StatCard
          label="Top Performers"
          value={topPerformers.length}
          sub="Scoring above average"
          color="purple"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top performers */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Top Performing Candidates</h2>
              <p className="text-xs text-slate-500 mt-0.5">Highest quiz scores on the platform</p>
            </div>
            <button
              onClick={() => nav("/company/candidates")}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              View all →
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-slate-400 py-4 text-center">Loading…</div>
          ) : topPerformers.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No quiz submissions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                      #{i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.email}</div>
                      {p.quizName && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.quizName}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right min-w-[60px]">
                    <div className="text-sm font-bold text-slate-900">{p.scorePercent}%</div>
                    <ScoreBar percent={p.scorePercent} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + company info */}
        <div className="space-y-4">
          {/* Company status card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Company Status</h2>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Account status</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">
                  Approved ✓
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Recruitment access</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">
                  Active
                </span>
              </div>
              {profile?.address?.country && (
                <div className="flex items-center justify-between">
                  <span>Country</span>
                  <span className="font-medium text-slate-800">{profile.address.country}</span>
                </div>
              )}
              {profile?.contactName && (
                <div className="flex items-center justify-between">
                  <span>Contact</span>
                  <span className="font-medium text-slate-800">{profile.contactName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => nav("/company/candidates")}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="text-indigo-500">👥</span> Browse Candidates
              </button>
              <button
                onClick={() => nav("/company/candidates?tab=top")}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="text-amber-500">⭐</span> Top Performers
              </button>
              <button
                onClick={() => nav("/company/profile")}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="text-emerald-500">🏢</span> Edit Company Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Platform info banner */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-base">Find your next hire on SkillLens AI</h3>
            <p className="text-indigo-200 text-xs mt-1">
              Browse skill-verified candidates who have completed AI-powered assessments.
            </p>
          </div>
          <button
            onClick={() => nav("/company/candidates")}
            className="shrink-0 rounded-xl bg-white px-5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            Browse Candidates
          </button>
        </div>
      </div>
    </CompanyShell>
  );
};

export default CompanyDashboardHome;

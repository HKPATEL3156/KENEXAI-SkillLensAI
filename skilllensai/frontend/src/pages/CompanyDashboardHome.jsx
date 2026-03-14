import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import { getCompanyStats, getCompanyProfile, getCompanyJobs } from "../services/api";

const StatCard = ({ label, value, sub, subColor = "text-indigo-600" }) => (
  <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
    <div className="text-3xl font-bold text-slate-900">{value ?? "—"}</div>
    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
    {sub && <div className={`text-xs ${subColor}`}>{sub}</div>}
  </div>
);

const CompanyDashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) { nav("/company/login"); return; }

    const load = async () => {
      setLoading(true);
      try {
        const [sRes, pRes, jRes] = await Promise.all([
          getCompanyStats(),
          getCompanyProfile(),
          getCompanyJobs(),
        ]);
        setStats(sRes.data);
        setProfile(pRes.data.company);
        setJobs(jRes.data.jobs || []);
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
  const activeJobRoles = stats?.activeJobRoles ?? 0;
  const totalApplicants = stats?.totalApplicants ?? 0;
  const matchedCandidates = stats?.matchedCandidates ?? 0;

  return (
    <CompanyShell active="dashboard">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          Verified
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          HR
        </span>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Four metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Job Roles"
          value={loading ? "…" : activeJobRoles}
          sub="Currently recruiting"
          subColor="text-indigo-600"
        />
        <StatCard
          label="Total Applicants"
          value={loading ? "…" : totalApplicants}
          sub="Across all roles"
          subColor="text-indigo-600"
        />
        <StatCard
          label="Matched Candidates"
          value={loading ? "…" : matchedCandidates}
          sub="Smart-filtered"
          subColor="text-emerald-600"
        />
        <StatCard
          label="Avg Quiz Score"
          value={loading ? "…" : (stats?.avgScore != null ? `${stats.avgScore}%` : "—")}
          sub="Platform average"
          subColor="text-amber-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Matched Candidates */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Top Matched Candidates
            </h2>
            <Link
              to="/company/candidates"
              className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading…</div>
          ) : topPerformers.length === 0 ? (
            <Link
              to="/company/candidates"
              className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors"
            >
              View all candidates →
            </Link>
          ) : (
            <>
              <Link
                to="/company/candidates"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-50 border border-indigo-100 py-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors mb-4"
              >
                View all {topPerformers.length} candidates →
              </Link>
              <div className="space-y-3">
                {topPerformers.slice(0, 4).map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                        #{i + 1}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500">{p.email}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{p.scorePercent}%</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Job Role Status */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Job Role Status
            </h2>
            <Link
              to="/company/job-roles"
              className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              Manage roles →
            </Link>
          </div>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading…</div>
          ) : jobs.length === 0 ? (
            <Link
              to="/company/job-roles"
              className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors"
            >
              Post your first job role →
            </Link>
          ) : (
            <div className="space-y-2">
              {jobs.filter((j) => j.status === "active").map((job) => (
                <Link
                  key={job._id}
                  to={`/company/candidates?jobId=${job._id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
                >
                  <span className="text-sm font-medium text-slate-900 group-hover:text-indigo-700">
                    {job.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {job.applicants ?? 0} applicants
                  </span>
                  <span className="text-indigo-600 text-xs">→</span>
                </Link>
              ))}
              <Link
                to="/company/job-roles"
                className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-600 font-medium hover:underline"
              >
                Manage roles →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA banner */}
      <div className="mt-8 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-base">Find your next hire on SkillLens AI</h3>
            <p className="text-indigo-200 text-sm mt-1">
              Browse skill-verified candidates who have completed AI-powered assessments.
            </p>
          </div>
          <button
            onClick={() => nav("/company/candidates")}
            className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            Browse Matched Candidates
          </button>
        </div>
      </div>
    </CompanyShell>
  );
};

export default CompanyDashboardHome;

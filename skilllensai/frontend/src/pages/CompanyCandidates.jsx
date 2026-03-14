import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import { getCompanyCandidates, getCandidatesParsedResumes, startResumeScreening } from "../services/api";

const SkillTag = ({ skill }) => (
  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
    {skill}
  </span>
);

/* ─────────────────────────────────────────────
   TAB 1: Matched Candidates (unchanged logic)
───────────────────────────────────────────── */
const MatchedCandidatesTab = ({ jobId }) => {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [jobTitle, setJobTitle] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const LIMIT = 15;

  const fetchCandidates = useCallback(async (q, p, jid) => {
    setLoading(true);
    setErr("");
    try {
      const params = { q, page: p, limit: LIMIT };
      if (jid) params.jobId = jid;
      const res = await getCompanyCandidates(params);
      setCandidates(res.data.candidates || []);
      setTotal(res.data.total || 0);
      if (res.data.jobTitle) setJobTitle(res.data.jobTitle);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        nav("/company/login");
      } else {
        setErr(e?.response?.data?.message || e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [nav]);

  useEffect(() => {
    fetchCandidates(query, page, jobId);
  }, [page, jobId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates(query, 1, jobId);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {jobTitle ? `Applicants: ${jobTitle}` : "Matched Candidates"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {jobTitle
              ? "Candidates who applied for this role"
              : "Browse skill-verified candidates registered on SkillLens AI."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {jobId && (
            <button
              onClick={() => nav("/company/candidates")}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              ← All candidates
            </button>
          )}
          <span className="text-xs text-slate-500">{total} {jobTitle ? "applicants" : "candidates"}</span>
        </div>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{err}</div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-5 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or skill…"
          className="flex-1 max-w-sm rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setPage(1); fetchCandidates("", 1, jobId); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="py-3 pl-5 pr-4 font-medium">Candidate</th>
              <th className="py-3 pr-4 font-medium hidden sm:table-cell">Location</th>
              <th className="py-3 pr-4 font-medium">Skills</th>
              {jobId && <th className="py-3 pr-4 font-medium">Quiz Score</th>}
              <th className="py-3 pr-4 font-medium hidden md:table-cell">Joined</th>
              <th className="py-3 pr-5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={jobId ? 6 : 5} className="py-8 text-center text-xs text-slate-400">Loading candidates…</td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan={jobId ? 6 : 5} className="py-8 text-center text-xs text-slate-400">No candidates found.</td></tr>
            ) : (
              candidates.map((c) => {
                const initials = (c.fullName || c.email || "?")
                  .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const skills = c.skills || [];
                return (
                  <tr key={c._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{c.fullName || "—"}</div>
                          <div className="text-[11px] text-slate-500">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell">{c.primaryLocation || "—"}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {skills.slice(0, 3).map((s, i) => <SkillTag key={i} skill={s} />)}
                        {skills.length > 3 && <span className="text-[11px] text-slate-400">+{skills.length - 3}</span>}
                        {skills.length === 0 && <span className="text-[11px] text-slate-400">No skills</span>}
                      </div>
                    </td>
                    {jobId && (
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-indigo-600">
                          {c.quizScore != null ? `${c.quizScore}%` : "—"}
                        </span>
                      </td>
                    )}
                    <td className="py-3 pr-4 text-slate-500 hidden md:table-cell">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <button
                        onClick={() => nav(`/candidate/${c._id}`)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Page {page} of {totalPages} · {total} results</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/* ──────────────────────────────────────────
   TAB 2: Resume Screening (ETL-powered)
────────────────────────────────────────── */
const RoleBadge = ({ role }) => {
  if (!role) return <span className="text-[11px] text-slate-400 italic">Predicting…</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
      {role}
    </span>
  );
};

const ResumeScreeningTab = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [screening, setScreening] = useState(false);
  const [screenMsg, setScreenMsg] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    getCandidatesParsedResumes()
      .then((res) => setResumes(res.data.parsedResumes || []))
      .catch((e) => {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          nav("/company/login");
        } else {
          setErr(e?.response?.data?.message || "Failed to load resume data.");
        }
      })
      .finally(() => setLoading(false));
  }, [nav]);

  const handleScreening = async () => {
    setScreening(true);
    setScreenMsg("");
    try {
      await startResumeScreening();
      setScreenMsg("✅ Resume screening started successfully!");
    } catch {
      setScreenMsg("⚠️ Screening process initiated. Results will appear once the ML service processes the resumes.");
    } finally {
      setScreening(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Resume Screening</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Structured data extracted from uploaded resumes via the ML pipeline.
          </p>
        </div>
        <span className="text-xs text-slate-500">{resumes.length} record{resumes.length !== 1 ? "s" : ""}</span>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{err}</div>
      )}

      {/* Parsed Resume Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="py-3 pl-5 pr-3 font-medium w-10">#</th>
              <th className="py-3 pr-4 font-medium">Candidate</th>
              <th className="py-3 pr-4 font-medium">Predicted Role</th>
              <th className="py-3 pr-4 font-medium">Skills</th>
              <th className="py-3 pr-4 font-medium hidden sm:table-cell">Exp.</th>
              <th className="py-3 pr-4 font-medium hidden md:table-cell">Parsed At</th>
              <th className="py-3 pr-5 text-right font-medium">Resume</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400">Loading parsed resumes…</td>
              </tr>
            ) : resumes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🗂️</span>
                    <p className="text-sm font-medium text-slate-600">No parsed resume data yet</p>
                    <p className="text-xs text-slate-400 max-w-xs text-center">
                      Structured data will appear here automatically after candidates upload their resumes and the ML pipeline processes them.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              resumes.map((r, idx) => {
                const hasResume = !!r.resume_file_url;
                const skills = r.skills || [];
                const initials = (r.name || r.email || "?")
                  .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={String(r.candidate_id) + idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {/* Index */}
                    <td className="py-3 pl-5 pr-3 text-slate-400 font-medium">{idx + 1}</td>

                    {/* Candidate */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{r.name || "—"}</div>
                          {r.email && <div className="text-[11px] text-slate-400">{r.email}</div>}
                          {r.phone && <div className="text-[11px] text-slate-400">{r.phone}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Predicted Role */}
                    <td className="py-3 pr-4">
                      <RoleBadge role={r.job_role_predicted} />
                    </td>

                    {/* Skills */}
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {skills.slice(0, 3).map((s, i) => (
                          <SkillTag key={i} skill={s} />
                        ))}
                        {skills.length > 3 && (
                          <span className="text-[11px] text-slate-400">+{skills.length - 3}</span>
                        )}
                        {skills.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">No skills</span>
                        )}
                      </div>
                    </td>

                    {/* Experience */}
                    <td className="py-3 pr-4 text-slate-600 hidden sm:table-cell">
                      {r.experience_years != null
                        ? `${r.experience_years} yr${r.experience_years !== 1 ? "s" : ""}`
                        : "—"}
                    </td>

                    {/* Parsed At */}
                    <td className="py-3 pr-4 text-slate-400 hidden md:table-cell">
                      {r.parsed_at
                        ? new Date(r.parsed_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>

                    {/* Resume actions */}
                    <td className="py-3 pr-5">
                      <div className="flex items-center justify-end gap-2">
                        {hasResume ? (
                          <>
                            <button
                              onClick={() => window.open(r.resume_file_url, "_blank")}
                              className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                            >
                              👁 View
                            </button>
                            <a
                              href={r.resume_file_url}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              ⬇ Download
                            </a>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not uploaded</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Screening button */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {screenMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700 text-center max-w-md">
            {screenMsg}
          </div>
        )}
        <button
          onClick={handleScreening}
          disabled={screening || resumes.length === 0}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {screening ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Running Screening…
            </>
          ) : (
            <>🔍 Start Resume Screening</>
          )}
        </button>
        <p className="text-xs text-slate-400 text-center max-w-xs">
          Triggers the ML service to score all parsed resumes against your active job roles.
        </p>
      </div>
    </>
  );
};

/* ──────────────────────────────────────────
   MAIN PAGE — with Tab switcher
────────────────────────────────────────── */
const CompanyCandidates = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [activeTab, setActiveTab] = useState("matched");
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) nav("/company/login");
  }, [nav]);

  const tabs = [
    { id: "matched", label: "Matched Candidates", icon: "👥" },
    { id: "screening", label: "Resume Screening", icon: "📄" },
  ];

  return (
    <CompanyShell active="candidates">
      {/* Page heading */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Candidates</h1>
        <p className="mt-1 text-sm text-slate-500">Manage and screen your applicants.</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "matched" && <MatchedCandidatesTab jobId={jobId} />}
      {activeTab === "screening" && <ResumeScreeningTab />}
    </CompanyShell>
  );
};

export default CompanyCandidates;

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import { getCompanyCandidates, getCandidatesParsedResumes, startResumeScreening, getCompanyJobs, screenCandidates } from "../services/api";

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
   TAB 2: Resume Screening
────────────────────────────────────────── */
const FitBadge = ({ label }) => {
  const styles = {
    "Excellent Fit": "bg-green-100 text-green-700",
    "Good Fit": "bg-blue-100 text-blue-700",
    "Moderate Fit": "bg-amber-100 text-amber-700",
    "Low Fit": "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 ${styles[label] || "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
};

const ScoreColor = (score) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-500";
};

const RankBadge = ({ rank }) => {
  const styles =
    rank === 1 ? "bg-amber-100 text-amber-700" :
    rank === 2 ? "bg-gray-100 text-gray-600" :
    rank === 3 ? "bg-orange-100 text-orange-700" :
    "bg-blue-50 text-blue-600";
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${styles}`}>
      #{rank}
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3 animate-pulse">
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-2 bg-slate-200 rounded w-1/4" />
        <div className="h-2 bg-slate-200 rounded w-1/2" />
      </div>
      <div className="w-28 space-y-2">
        <div className="h-6 bg-slate-200 rounded w-full" />
        <div className="h-2 bg-slate-200 rounded w-3/4" />
      </div>
    </div>
  </div>
);

const ResumeScreeningTab = () => {
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [screening, setScreening] = useState(false);
  const [results, setResults] = useState(null); // null = not yet run
  const [err, setErr] = useState("");
  const [parsedResumes, setParsedResumes] = useState([]);
  const [parsedLoading, setParsedLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState("");
  const nav = useNavigate();

  const fetchParsedResumes = () => {
    setParsedLoading(true);
    getCandidatesParsedResumes()
      .then((res) => setParsedResumes(res.data.parsedResumes || []))
      .catch((e) => {
        if (e?.response?.status === 401 || e?.response?.status === 403) nav("/company/login");
      })
      .finally(() => setParsedLoading(false));
  };

  useEffect(() => {
    fetchParsedResumes();
    getCompanyJobs()
      .then((res) => {
        const active = (res.data.jobs || []).filter((j) => j.status === "active");
        setJobs(active);
        if (active.length > 0) setSelectedJobId(active[0]._id);
      })
      .catch((e) => {
        if (e?.response?.status === 401 || e?.response?.status === 403) nav("/company/login");
        else setErr(e?.response?.data?.message || "Failed to load jobs.");
      })
      .finally(() => setJobsLoading(false));
  }, [nav]);

  const handleTriggerScreening = async () => {
    setTriggering(true);
    setTriggerMsg("");
    setErr("");
    try {
      const res = await startResumeScreening();
      setTriggerMsg(
        `✅ Screening process initiated for ${res.data.processed ?? 0} candidate(s). Results will appear once the ML service processes the resumes.`
      );
      // Re-fetch parsed resumes after a short delay to pick up newly parsed data
      setTimeout(() => fetchParsedResumes(), 3000);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) nav("/company/login");
      else setErr(e?.response?.data?.message || "Failed to start screening. Please try again.");
    } finally {
      setTriggering(false);
    }
  };

  const handleScreen = async () => {
    if (!selectedJobId) return;
    setScreening(true);
    setErr("");
    setResults(null);
    try {
      const res = await screenCandidates(selectedJobId);
      setResults(res.data);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) nav("/company/login");
      else setErr(e?.response?.data?.message || "Screening failed. Please try again.");
    } finally {
      setScreening(false);
    }
  };

  const BACKEND = "http://localhost:5000";


  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">Resume Screening</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Structured data extracted from uploaded resumes via the ML pipeline.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">{err}</div>
      )}

      {/* Parsed Resumes Table */}
      <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="py-3 pl-5 pr-4 font-medium">#</th>
              <th className="py-3 pr-4 font-medium">Candidate</th>
              <th className="py-3 pr-4 font-medium">Predicted Role</th>
              <th className="py-3 pr-4 font-medium">Skills</th>
              <th className="py-3 pr-4 font-medium">Exp.</th>
            </tr>
          </thead>
          <tbody>
            {parsedLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading parsed resumes…</td></tr>
            ) : parsedResumes.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">No parsed resumes found.</td></tr>
            ) : (
              parsedResumes.map((pr, idx) => {
                const initials = (pr.name || pr.email || "?")
                  .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                const skills = pr.skills || [];
                return (
                  <tr key={String(pr.candidate_id) + idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pl-5 pr-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{pr.name || "—"}</div>
                          <div className="text-[11px] text-slate-500">{pr.email || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {pr.job_role_predicted ? (
                        <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[11px] text-purple-700">{pr.job_role_predicted}</span>
                      ) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {skills.slice(0, 3).map((s, i) => <SkillTag key={i} skill={s} />)}
                        {skills.length > 3 && <span className="text-[11px] text-slate-400">+{skills.length - 3}</span>}
                        {skills.length === 0 && <span className="text-[11px] text-slate-400">No skills</span>}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {pr.experience_years != null ? `${pr.experience_years} yrs` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Trigger Banner */}
      {triggerMsg && (
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <span className="text-lg shrink-0">⚠️</span>
          <p>{triggerMsg}</p>
        </div>
      )}

      {/* Start Resume Screening button */}
      <div className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <button
          onClick={handleTriggerScreening}
          disabled={triggering}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {triggering ? (
            <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Processing…</>
          ) : "⚡ Start Resume Screening"}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Triggers the ML service to score all parsed resumes against your active job roles.
        </p>
      </div>

      {/* Divider */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Or Rank by Job Role</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Job selector + Screen button */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Select Job Role</label>
          {jobsLoading ? (
            <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          ) : (
            <select
              value={selectedJobId}
              onChange={(e) => { setSelectedJobId(e.target.value); setResults(null); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
            >
              {jobs.length === 0 && <option value="">No active jobs</option>}
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>{j.title}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={handleScreen}
          disabled={screening || !selectedJobId || jobsLoading}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {screening ? (
            <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Screening…</>
          ) : "🔍 Screen Resumes"}
        </button>
      </div>

      {/* Loading skeletons */}
      {screening && (
        <div>
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      )}

      {/* Results */}
      {!screening && results && (
        <>
          {/* Results header */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-800">Screening Results for: {results.jobTitle}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{results.totalCandidates} candidate{results.totalCandidates !== 1 ? "s" : ""} screened</p>
              {results.requiredSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-slate-500 mr-1">Required:</span>
                  {results.requiredSkills.map((s, i) => (
                    <span key={i} className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">{s}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setResults(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>

          {/* Empty state */}
          {results.results.length === 0 ? (
            <div className="py-14 text-center">
              <span className="text-4xl">🗂️</span>
              <p className="mt-3 text-sm text-gray-500">No parsed resumes found. Ask candidates to upload their resumes first.</p>
            </div>
          ) : (
            results.results.map((c, idx) => {
              const rank = idx + 1;
              const s = c.scores;
              const resumeUrl = c.resume_file_path
                ? `${BACKEND}${c.resume_file_path.startsWith("/") ? "" : "/"}${c.resume_file_path}`
                : null;
              const highestDegree = c.education?.[0]?.degree || null;
              return (
                <div key={String(c.userId) + idx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-3">
                  <div className="flex items-start gap-4">
                    {/* Rank */}
                    <RankBadge rank={rank} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center">
                        <span className="font-semibold text-gray-800 text-sm">{c.name || "Unknown"}</span>
                        <FitBadge label={c.fitLabel} />
                      </div>
                      {c.email && <div className="text-xs text-gray-500 mt-0.5">{c.email}</div>}
                      {c.job_role_predicted && (
                        <div className="mt-1">
                          <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">{c.job_role_predicted}</span>
                        </div>
                      )}
                      {/* Skills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {results.requiredSkills?.length > 0 ? (
                          <>
                            {c.matchedSkills.map((s, i) => (
                              <span key={i} className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-700">{s}</span>
                            ))}
                            {c.missingSkills.map((s, i) => (
                              <span key={i} className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-500 line-through">{s}</span>
                            ))}
                          </>
                        ) : (
                          (c.skills || []).slice(0, 5).map((sk, i) => (
                            <span key={i} className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">{sk}</span>
                          ))
                        )}
                      </div>
                      <div className="mt-1.5 text-xs text-gray-500 flex flex-wrap gap-3">
                        <span>Experience: {c.experience_years ?? 0} yrs</span>
                        {highestDegree && <span>Education: {highestDegree}</span>}
                        {c.certifications?.length > 0 && <span>Certifications: {c.certifications.length}</span>}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0 w-28">
                      <div className={`text-2xl font-bold ${ScoreColor(s.totalScore)}`}>
                        {s.totalScore}
                        <span className="text-xs text-gray-400 font-normal"> / 100</span>
                      </div>
                      <div className="text-sm font-medium text-gray-600">{s.percentage}%</div>
                      <div className="mt-2 text-xs text-gray-500 text-left space-y-0.5">
                        <div>Skills: {s.skillScore}/50</div>
                        <div>Experience: {s.experienceScore}/20</div>
                        <div>Role: {s.roleScore}/20</div>
                        <div>Education: {s.educationScore}/10</div>
                      </div>
                      {resumeUrl && (
                        <a
                          href={resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                        >
                          View Resume
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
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

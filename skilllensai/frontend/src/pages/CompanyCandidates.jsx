import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import { getCompanyCandidates } from "../services/api";

const SkillTag = ({ skill }) => (
  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
    {skill}
  </span>
);

const CandidateModal = ({ candidate, onClose }) => {
  if (!candidate) return null;
  const skills = candidate.skills || [];
  const initials = (candidate.fullName || candidate.email || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {candidate.fullName || "—"}
              </h2>
              <p className="text-xs text-slate-500">{candidate.email}</p>
              {candidate.headline && (
                <p className="text-xs text-slate-400 mt-0.5">{candidate.headline}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-600">
          {candidate.username && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">Username</span>
              <span>@{candidate.username}</span>
            </div>
          )}
          {candidate.primaryLocation && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">Location</span>
              <span>{candidate.primaryLocation}</span>
            </div>
          )}
          {candidate.quizScore != null && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">Quiz Score</span>
              <span className="font-semibold text-indigo-600">{candidate.quizScore}%</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-800">Joined</span>
            <span>{candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : "—"}</span>
          </div>

          {skills.length > 0 && (
            <div>
              <div className="font-medium text-slate-800 mb-2">
                Skills ({skills.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, i) => (
                  <SkillTag key={i} skill={s} />
                ))}
              </div>
            </div>
          )}

          {skills.length === 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-400">
              No skills extracted yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CompanyCandidates = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [jobTitle, setJobTitle] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);
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
    const token = localStorage.getItem("companyToken");
    if (!token) { nav("/company/login"); return; }
    fetchCandidates(query, page, jobId);
  }, [page, jobId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates(query, 1, jobId);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <CompanyShell active="candidates">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {jobTitle ? `Applicants: ${jobTitle}` : "Matched Candidates"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {jobTitle
              ? `Candidates who applied for this role`
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
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
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
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
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
              <tr>
                <td colSpan={jobId ? 6 : 5} className="py-8 text-center text-xs text-slate-400">
                  Loading candidates…
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={jobId ? 6 : 5} className="py-8 text-center text-xs text-slate-400">
                  No candidates found.
                </td>
              </tr>
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
                    <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell">
                      {c.primaryLocation || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {skills.slice(0, 3).map((s, i) => (
                          <SkillTag key={i} skill={s} />
                        ))}
                        {skills.length > 3 && (
                          <span className="text-[11px] text-slate-400">+{skills.length - 3}</span>
                        )}
                        {skills.length === 0 && (
                          <span className="text-[11px] text-slate-400">No skills</span>
                        )}
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
                        onClick={() => setSelected(c)}
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
          <span>
            Page {page} of {totalPages} · {total} results
          </span>
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

      <CandidateModal candidate={selected} onClose={() => setSelected(null)} />
    </CompanyShell>
  );
};

export default CompanyCandidates;

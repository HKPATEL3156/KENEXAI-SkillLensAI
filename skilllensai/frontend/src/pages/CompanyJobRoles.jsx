import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import {
  getCompanyJobs,
  createCompanyJob,
  updateCompanyJob,
  deleteCompanyJob,
} from "../services/api";

const CompanyJobRoles = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    minExperienceYears: 0,
    skills: "",
    minScore: 60,
    jdFile: null,
  });
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await getCompanyJobs();
      setJobs(res.data.jobs || []);
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

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) {
      nav("/company/login");
      return;
    }
    load();
  }, [nav]);

  const resetForm = () => {
    setForm({
      title: "",
      minExperienceYears: 0,
      skills: "",
      minScore: 60,
      jdFile: null,
    });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      if (editing) {
        await updateCompanyJob(editing._id, {
          title: form.title,
          minExperienceYears: Number(form.minExperienceYears) || 0,
          skills: form.skills ? form.skills.split(",").map((s) => s.trim()) : [],
          minScore: Number(form.minScore) || 0,
        });
      } else {
        await createCompanyJob({
          title: form.title,
          minExperienceYears: Number(form.minExperienceYears) || 0,
          skills: form.skills ? form.skills.split(",").map((s) => s.trim()) : [],
          minScore: Number(form.minScore) || 0,
          jdFile: form.jdFile,
        });
      }
      resetForm();
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (job) => {
    setEditing(job);
    setForm({
      title: job.title || "",
      minExperienceYears: job.minExperienceYears ?? 0,
      skills: Array.isArray(job.skills) ? job.skills.join(", ") : "",
      minScore: job.minScore ?? 60,
      jdFile: null,
    });
    setShowForm(true);
  };

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete job "${job.title}"?`)) return;
    try {
      await deleteCompanyJob(job._id);
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  };

  const handleViewApplicants = (job) => {
    nav(`/company/candidates?jobId=${job._id}`);
  };

  return (
    <CompanyShell active="job-roles">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage job openings. Students apply from the platform; view applicants per job.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          + Post Job
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Post/Edit Job Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editing ? "Edit Job" : "Post New Job"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Developer"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Minimum Experience (years)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.minExperienceYears}
                  onChange={(e) =>
                    setForm({ ...form, minExperienceYears: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Minimum Quiz Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.minScore}
                  onChange={(e) => setForm({ ...form, minScore: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  placeholder="Python, Django, SQL"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Job Description PDF *
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) =>
                      setForm({
                        ...form,
                        jdFile: e.target.files && e.target.files[0],
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-700"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    We will extract the text from this PDF and store it as the
                    job description.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : editing ? "Update" : "Post Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Jobs list */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-indigo-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No job roles yet</h2>
          <p className="text-sm text-slate-500 mb-6">Post your first job to receive applications from candidates.</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Post Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Min exp: {job.minExperienceYears ?? 0} yrs · Min score: {job.minScore}% · Applicants:{" "}
                    {job.applicants ?? 0}
                  </p>
                  {Array.isArray(job.skills) && job.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.skills.slice(0, 5).map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewApplicants(job)}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    View applicants →
                  </button>
                  <button
                    onClick={() => handleEdit(job)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(job)}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CompanyShell>
  );
};

export default CompanyJobRoles;

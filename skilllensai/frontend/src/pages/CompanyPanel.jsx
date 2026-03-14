import React, { useEffect, useState } from "react";
import {
  getCompanyJobs,
  createCompanyJob,
  scoreAllApplications,
  scoreApplication,
} from "../services/api";

export default function CompanyPanel() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    minExperienceYears: 0,
    minScore: 60,
    skills: "",
    employmentType: "full-time",
    jdFile: null,
    location: "",
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await getCompanyJobs();
      const jobsData = (res.data && res.data.jobs) || [];
      setJobs(jobsData);
      if (jobsData.length > 0 && !selectedJobId) setSelectedJobId(jobsData[0]._id || jobsData[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchApplicants = async (jobId) => {
    try {
      const token = localStorage.getItem("companyToken");
      if (!token) return;
      const resp = await fetch(`/api/company/dashboard/jobs/${jobId}/applicants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setApplicants(data.candidates || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedJobId) fetchApplicants(selectedJobId);
  }, [selectedJobId]);

  const handlePost = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("minExperienceYears", String(form.minExperienceYears || 0));
      payload.append("minScore", String(form.minScore || 0));
      payload.append("skills", form.skills || "");
      payload.append("employmentType", form.employmentType || "full-time");
      if (form.location) payload.append("location", form.location);
      if (form.jdFile) payload.append("jdFile", form.jdFile);
      await createCompanyJob(payload);
      setForm({ title: "", minExperienceYears: 0, minScore: 60, skills: "", employmentType: "full-time", jdFile: null, location: "" });
      await fetchJobs();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  const handleScoreOne = async (applicationId) => {
    try {
      await scoreApplication(applicationId);
      // refresh
      if (selectedJobId) fetchApplicants(selectedJobId);
    } catch (e) {
      alert("Scoring failed");
    }
  };

  const handleScoreAll = async () => {
    if (!selectedJobId) return alert("Select a job first");
    try {
      await scoreAllApplications(selectedJobId);
      fetchApplicants(selectedJobId);
    } catch (e) {
      alert("Batch scoring failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Company Panel</h1>
        </header>

        <section className="grid grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold mb-3">Post New Job</h2>
            <form onSubmit={handlePost} className="space-y-3">
              <div>
                <label className="block text-sm">Title *</label>
                <input required className="w-full border p-2 rounded" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm">Minimum Experience (years)</label>
                <input type="number" min="0" className="w-full border p-2 rounded" value={form.minExperienceYears} onChange={(e) => setForm({ ...form, minExperienceYears: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm">Minimum Quiz Score (%)</label>
                <input type="number" min="0" max="100" className="w-full border p-2 rounded" value={form.minScore} onChange={(e) => setForm({ ...form, minScore: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm">Skills (comma separated)</label>
                <input className="w-full border p-2 rounded" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, Django, SQL" />
              </div>
              <div>
                <label className="block text-sm">Employment Type</label>
                <select className="w-full border p-2 rounded" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="internship">Internship</option>
                  <option value="remote">Remote</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Job Description PDF *</label>
                <input required accept="application/pdf" type="file" onChange={(e) => setForm({ ...form, jdFile: e.target.files[0] })} />
                <p className="text-xs text-gray-500 mt-1">We will extract text from this PDF and store it as the job description.</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setForm({ title: "", minExperienceYears: 0, minScore: 60, skills: "", employmentType: "full-time", jdFile: null, location: "" })} className="flex-1 py-2 rounded border">Cancel</button>
                <button disabled={loading} type="submit" className="flex-1 py-2 rounded bg-blue-600 text-white">{loading ? 'Posting...' : 'Post Job'}</button>
              </div>
            </form>
          </div>

          <div className="col-span-2 bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Jobs & Applicants</h2>
              <div className="flex gap-2">
                <button onClick={handleScoreAll} className="px-3 py-2 rounded bg-green-600 text-white">Score All</button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-2">Select Job</label>
              <select value={selectedJobId || ""} onChange={(e) => setSelectedJobId(e.target.value)} className="w-full border p-2 rounded">
                <option value="">-- choose job --</option>
                {jobs.map((j) => (
                  <option key={j._id || j.id} value={j._id || j.id}>{j.title} • {j.employmentType || j.status || ''}</option>
                ))}
              </select>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">#</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Resume</th>
                  <th className="py-2">Quiz%</th>
                  <th className="py-2">Resume Score</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((a, idx) => (
                  <tr key={a.applicationId || a._id} className="border-b">
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2">{a.fullName}</td>
                    <td className="py-2">{a.resumePath ? <a href={a.resumePath} target="_blank" rel="noreferrer" className="text-blue-600">View</a> : '—'}</td>
                    <td className="py-2">{a.quizScore ?? '-'}</td>
                    <td className="py-2">{a.resumeScore ?? 0}%</td>
                    <td className="py-2"><button onClick={() => handleScoreOne(a.applicationId)} className="px-3 py-1 rounded bg-indigo-600 text-white">Score</button></td>
                  </tr>
                ))}
                {applicants.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-500">No applicants yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

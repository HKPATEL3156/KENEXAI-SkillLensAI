import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { applyToJob, applyToJobWithResume } from '../services/api';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [err, setErr] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/jobs/${id}`);
        setJob(res.data.job);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleApply = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setApplying(true);
    setErr('');
    try {
      if (resumeFile || coverLetter) {
        await applyToJobWithResume(id, resumeFile, coverLetter);
      } else {
        await applyToJob(id);
      }
      setApplied(true);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!job) return <div className="p-6">Job not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="text-sm text-gray-600">
              {job.companyName} • Min exp: {job.minExperienceYears ?? 0} yrs
            </div>
          </div>
          <div className="text-sm text-gray-500">Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}</div>
        </div>

        <div className="mt-4 text-gray-700 whitespace-pre-line">
          {job.description || ''}
        </div>

        <div className="mt-4">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Attach resume (optional)</label>
            <input type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e)=>setResumeFile(e.target.files[0]||null)} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Cover letter (optional)</label>
            <textarea value={coverLetter} onChange={(e)=>setCoverLetter(e.target.value)} className="w-full p-2 border rounded" rows={4} />
          </div>
          <div className="font-semibold mb-1">Skills</div>
          <div className="flex gap-2 flex-wrap">{(job.skills||[]).map((s,i)=>(<span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{s}</span>))}</div>
        </div>

        <div className="mt-4 flex gap-2 items-center">
          {applied ? (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded font-medium">Application submitted ✓</span>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
            >
              {applying ? 'Applying...' : 'Apply for this role'}
            </button>
          )}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
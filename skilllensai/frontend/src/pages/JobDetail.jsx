import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { applyToJob, applyToJobWithResume, getProfile, uploadResume, downloadCareerResume, downloadResume, getQuizAttempts } from '../services/api';

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
  const [academic, setAcademic] = useState({ degree: '', institution: '', cgpa: '' });
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [attempts, setAttempts] = useState([]);

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
    // load user profile (resume/info), career and quiz attempts to prefill application
    (async () => {
      try {
        const r = await getProfile();
        const prof = r.data.profile || r.data || null;
        setProfile(prof);
        if (prof?.resumePath) setUseProfileResume(true);
      } catch (e) {
        // ignore if not logged in
      }
      // career document is optional; full profile fetched above contains education/experience
      try {
        const qa = await getQuizAttempts();
        setAttempts(qa.data.attempts || []);
      } catch (e) {
        // ignore
      }
    })();
  }, [id]);

  const handleApply = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setApplying(true);
    setErr('');
    // validation: resume required, academic fields required, consent required, cover letter required
    if (!useProfileResume && !resumeFile) {
      setErr('Please upload your resume or choose your uploaded resume before applying.');
      setApplying(false);
      return;
    }
    if (!academic.degree || !academic.institution || !academic.cgpa) {
      setErr('Please fill your academic details (degree, institution, CGPA/Percent).');
      setApplying(false);
      return;
    }
    if (!consentConfirmed) {
      setErr('Please confirm that the information provided is accurate.');
      setApplying(false);
      return;
    }
    if (!coverLetter || coverLetter.trim().length < 20) {
      setErr('Please provide a cover letter (at least 20 characters).');
      setApplying(false);
      return;
    }
    try {
      // If user chose to use their uploaded profile resume, fetch it from profile
      if (useProfileResume && profile?.resumePath) {
        // the backend apply endpoint accepts resume upload; however putting a remote URL
        // is not supported here; prefer using applyToJob which uses current profile resume server-side.
        await applyToJob(id);
      } else if (resumeFile || coverLetter || academic.degree) {
        await applyToJobWithResume(id, resumeFile, coverLetter, academic, consentConfirmed);
      } else {
        await applyToJob(id);
      }
      setApplied(true);
      setErr('');
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!job) return <div className="p-6">Job not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="text-sm text-slate-500 mt-1">{job.companyName} • Min exp: {job.minExperienceYears ?? 0} yrs</div>
          </div>
          <div className="text-sm text-slate-400">Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}</div>
        </div>

        <div className="mt-6 text-slate-700 whitespace-pre-line">
          {job.description || ''}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Resume (required)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex items-center gap-4 bg-white">
                <div className="flex-1">
                  <div className="text-sm text-slate-600 mb-2">Upload your resume (PDF/DOC/DOCX). This is required to apply.</div>
                  <div className="flex items-center gap-3">
                    <input id="fileUpload" type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e)=>{setResumeFile(e.target.files[0]||null); setUseProfileResume(false);}} />
                    {profile?.resumePath && (
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={useProfileResume} onChange={e=>{setUseProfileResume(e.target.checked); if (e.target.checked) setResumeFile(null);}} />
                        Use uploaded resume ({profile.resumePath.split('/').pop()})
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={async () => {
                    try {
                      if (!resumeFile) return alert('Choose a file to upload');
                      await uploadResume(resumeFile);
                      const p = await getProfile();
                      setProfile(p.data.profile || p.data || null);
                      setUseProfileResume(true);
                      alert('Resume uploaded');
                    } catch (e) { console.error(e); alert('Upload failed'); }
                  }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow">Upload</button>
                  <button onClick={async () => {
                    try {
                      const dl = await downloadCareerResume().catch(()=>downloadResume());
                      const blob = new Blob([dl.data], { type: dl.headers?.['content-type'] || 'application/octet-stream' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = profile?.resumePath?.split('/')?.pop() || 'resume.pdf';
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (e) { console.error(e); alert('Download failed'); }
                  }} className="px-3 py-1 border rounded">Download</button>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <input placeholder="Degree (e.g. B.Tech)" value={academic.degree} onChange={e=>setAcademic({...academic, degree: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Institution" value={academic.institution} onChange={e=>setAcademic({...academic, institution: e.target.value})} className="border p-2 rounded" />
              <input placeholder="CGPA/Percent" value={academic.cgpa} onChange={e=>setAcademic({...academic, cgpa: e.target.value})} className="border p-2 rounded" />
            </div>

            <div className="mb-4">
              <label className="inline-flex items-center">
                <input type="checkbox" checked={consentConfirmed} onChange={e=>setConsentConfirmed(e.target.checked)} className="mr-2" />
                <span className="text-sm text-slate-600">I confirm the information provided is accurate</span>
              </label>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Cover letter (required)</label>
              <textarea value={coverLetter} onChange={(e)=>setCoverLetter(e.target.value)} className="w-full p-3 border rounded" rows={6} />
            </div>
            {err && <div className="text-sm text-rose-600 font-medium mb-2">{err}</div>}
          </div>

          <aside className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="font-semibold mb-2">Profile</div>
            {profile ? (
              <div className="text-sm text-slate-700">
                <div className="font-medium">{profile.fullName || profile.name || '—'}</div>
                <div className="text-xs text-slate-500">{profile.email}</div>
                {profile.headline && <div className="text-xs text-slate-500">{profile.headline}</div>}
                {profile.primaryLocation && <div className="text-xs text-slate-500">{profile.primaryLocation}</div>}
                <div className="mt-3">
                  <div className="text-xs font-medium mb-1">Saved resume</div>
                  {profile.resumePath ? (
                    <div className="flex items-center gap-2">
                      <a className="text-sm text-indigo-600" href={profile.resumePath} target="_blank" rel="noreferrer">Open uploaded resume</a>
                      <a className="text-sm text-slate-500" href={profile.resumePath} download>· Download</a>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">No resume uploaded</div>
                  )}
                </div>
                {/* Experience summary */}
                {profile.experience && profile.experience.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium mb-1">Experience</div>
                    <div className="text-xs text-slate-600">
                      {profile.experience.slice(0,3).map((ex,i) => (
                        <div key={i} className="mb-1">{ex.role} @ {ex.company} <span className="text-[11px] text-slate-400">({ex.startDate ? new Date(ex.startDate).getFullYear() : ''} - {ex.currentlyWorking ? 'Present' : (ex.endDate ? new Date(ex.endDate).getFullYear() : '')})</span></div>
                      ))}
                      {profile.experience.length > 3 && <div className="text-[11px] text-slate-400">+{profile.experience.length - 3} more</div>}
                    </div>
                  </div>
                )}
                {/* Education */}
                {profile.education && profile.education.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium mb-1">Education</div>
                    <div className="text-xs text-slate-600">
                      {profile.education.map((ed,i) => (
                        <div key={i} className="mb-1">{ed.level || ed.degree} • {ed.institution} <span className="text-[11px] text-slate-400">{ed.cgpa ? `CGPA: ${ed.cgpa}` : (ed.percentage ? `Percent: ${ed.percentage}` : '')}</span></div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Quiz / skill score summary */}
                {attempts && attempts.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-medium mb-1">Latest Quiz</div>
                    {(() => {
                      const submitted = attempts.filter(a => a.status === 'submitted').slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
                      const latest = submitted[0] || attempts.slice().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))[0];
                      if (!latest) return <div className="text-xs text-slate-400">No quiz attempts</div>;
                      return (<div className="text-xs text-slate-700">{latest.quizName || 'Quiz'} — <span className="font-semibold text-indigo-600">{latest.obtainedMarks || 0}/{latest.totalMarks || 0}</span></div>);
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Sign in to auto-fill your details and use your uploaded resume.</div>
            )}

            <div className="mt-4">
              <div className="font-semibold mb-1">Skills</div>
              <div className="flex gap-2 flex-wrap">{(job.skills||[]).map((s,i)=>(<span key={i} className="text-xs bg-white px-2 py-1 rounded-lg border">{s}</span>))}</div>
            </div>
          </aside>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {applied ? (
            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded font-medium">Application submitted ✓</span>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
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
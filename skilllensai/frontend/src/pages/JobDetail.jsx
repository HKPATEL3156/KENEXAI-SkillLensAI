import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { applyToJobWithResume, getProfile, uploadResume, downloadResume, getQuizAttempts } from '../services/api';

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
  const [hasProfileResume, setHasProfileResume] = useState(false);
  const [hasProfileEducation, setHasProfileEducation] = useState(false);
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

    (async () => {
      try {
        const r = await getProfile();
        const prof = r.data.profile || r.data || null;
        setProfile(prof);
        
        // Auto-use stored resume if available
        if (prof?.resumeFilePath) {
          setHasProfileResume(true);
        }

        // Auto-fill and hide education if available
        if (prof?.education && prof.education.length > 0) {
          const latestEd = prof.education[0];
          setAcademic({
            degree: latestEd.level || latestEd.degree || '',
            institution: latestEd.institution || '',
            cgpa: latestEd.cgpa || latestEd.percentage || ''
          });
          setHasProfileEducation(true);
        }

      } catch (e) {
        // ignore if not logged in
      }

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

    if (!hasProfileResume && !resumeFile) {
      setErr('Please upload your resume to apply.');
      setApplying(false);
      return;
    }
    if (!hasProfileEducation && (!academic.degree || !academic.institution || !academic.cgpa)) {
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
      // If we have a profile resume, we pass file as null. The backend falls back to the profile's resume.
      const fileToUpload = hasProfileResume ? null : resumeFile;
      await applyToJobWithResume(id, fileToUpload, coverLetter, academic, consentConfirmed);
      
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
            {/* 1. Resume Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Resume (required)</label>
              {hasProfileResume ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 text-lg">✓</span>
                    <span className="text-sm font-medium text-emerald-800">Saved resume will be used</span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">We'll attach the resume you already uploaded to your profile.</p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center gap-3 bg-white">
                  <div className="text-sm text-slate-600 text-center">Upload your resume (PDF/DOC) to apply.</div>
                  <input 
                    id="fileUpload" 
                    type="file" 
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                    onChange={(e)=>{setResumeFile(e.target.files[0]||null);}} 
                    className="text-sm max-w-full"
                  />
                </div>
              )}
            </div>

            {/* 2. Education Section */}
            {!hasProfileEducation && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Education Details (required)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Degree (e.g. B.Tech)" value={academic.degree} onChange={e=>setAcademic({...academic, degree: e.target.value})} className="border border-slate-200 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <input placeholder="Institution" value={academic.institution} onChange={e=>setAcademic({...academic, institution: e.target.value})} className="border border-slate-200 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  <input placeholder="CGPA/Percent" value={academic.cgpa} onChange={e=>setAcademic({...academic, cgpa: e.target.value})} className="border border-slate-200 p-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
            )}
            {hasProfileEducation && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">✓</span>
                  <span className="text-sm font-medium text-emerald-800">Education details populated</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1">{academic.degree} • {academic.institution} • {academic.cgpa}</p>
              </div>
            )}

            {/* 3. Cover Letter */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Cover letter (required)</label>
              <textarea 
                placeholder="Why are you a great fit for this role?"
                value={coverLetter} 
                onChange={(e)=>setCoverLetter(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" 
                rows={5} 
              />
            </div>

            {/* 4. Consent */}
            <div className="mb-4">
              <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={consentConfirmed} onChange={e=>setConsentConfirmed(e.target.checked)} className="mr-2 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700 font-medium">I confirm the information provided is accurate</span>
              </label>
            </div>
            
            {err && <div className="text-sm text-rose-600 font-medium mb-4">{err}</div>}
            
            {/* Submit Button */}
            <div className="mt-2">
              {applied ? (
                <div className="w-full px-5 py-3 bg-emerald-100 text-emerald-700 text-center rounded-xl font-semibold">
                  Application Submitted Successfully ✓
                </div>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full px-5 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {applying ? 'Submitting Application...' : 'Apply for this role'}
                </button>
              )}
            </div>
          </div>

          {/* Profile Summary Sidebar */}
          <aside className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit sticky top-6">
            <div className="font-bold text-slate-800 mb-4 text-lg">Your Profile Summary</div>
            {profile ? (
              <div className="space-y-4">
                <div>
                  <div className="font-semibold text-slate-900">{profile.fullName || profile.username || '—'}</div>
                  <div className="text-sm text-slate-500">{profile.email}</div>
                  {profile.headline && <div className="text-sm text-slate-600 mt-1">{profile.headline}</div>}
                </div>

                {profile.resumeFilePath ? (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resume</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📄</span>
                      <a className="text-sm font-medium text-indigo-600 hover:underline" href={`http://localhost:5000${profile.resumeFilePath}`} target="_blank" rel="noreferrer">
                        View document
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-200 text-sm text-slate-400">
                    No resume uploaded to profile.
                  </div>
                )}

                {profile.experience && profile.experience.length > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Experience</div>
                    <div className="space-y-2">
                      {profile.experience.slice(0,2).map((ex,i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-slate-800">{ex.role}</span> at <span className="text-slate-600">{ex.company}</span>
                        </div>
                      ))}
                      {profile.experience.length > 2 && <div className="text-xs text-indigo-600 font-medium">+{profile.experience.length - 2} more</div>}
                    </div>
                  </div>
                )}

                {profile.education && profile.education.length > 0 && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Education</div>
                    <div className="space-y-2">
                      {profile.education.map((ed,i) => (
                        <div key={i} className="text-sm text-slate-700">
                          <span className="font-semibold">{ed.level || ed.degree}</span> • {ed.institution}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic">Sign in to auto-fill your details.</div>
            )}

            <div className="pt-4 mt-4 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required Skills</div>
              <div className="flex gap-2 flex-wrap">
                {(job.skills||[]).map((s,i) => (
                  <span key={i} className="text-xs font-medium bg-white text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
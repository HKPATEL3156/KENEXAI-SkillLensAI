import React, { useEffect, useState } from "react";
import {
  getProfile,
  patchProfile,
  uploadEducationResult,
} from "../services/api";

const backendBase = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";

const baseInput = "w-full border rounded-lg px-3 py-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition";
const buttonPrimary = "bg-indigo-600 text-white font-medium px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition whitespace-nowrap";
const smallButtonPrimary = "bg-indigo-600 text-white px-3 py-2 rounded-md shadow-sm hover:bg-indigo-700 transition whitespace-nowrap";
const cardClass = "bg-white border rounded-xl p-6 shadow-sm";

const resolveAsset = (p) => {
  if (!p) return "";
  if (p.startsWith("/uploads") || p.startsWith("uploads")) return backendBase + (p.startsWith("/") ? p : `/${p}`);
  return p;
};

const MyAcademics = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [educationFiles, setEducationFiles] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProfile();
      const u = res.data?.user || res.data;
      setProfile(u || { education: [] });
    } catch (e) {
      console.error(e);
      setMessage('Failed to load profile'); setMessageType('error');
    } finally { setLoading(false); }
  };

  const handleFile = (eduIndex, file) => setEducationFiles(prev => ({ ...prev, [eduIndex]: file }));

  const doUpload = async (eduIndex) => {
    const file = educationFiles[eduIndex];
    if (!file) { setMessage('Select a file to upload'); setMessageType('error'); return; }
    try {
      setMessage('Uploading...'); setMessageType('');
      const res = await uploadEducationResult(file, eduIndex);
      const fp = res?.data?.resultFilePath || res?.data?.filePath || res?.data?.path;
      if (fp) {
        setProfile(prev => ({ ...prev, education: (prev.education||[]).map((ed, i) => i === eduIndex ? { ...ed, resultFilePath: fp } : ed) }));
      }
      setMessage('Uploaded'); setMessageType('success');
      setEducationFiles(prev => { const n = { ...prev }; delete n[eduIndex]; return n; });
    } catch (err) {
      console.error(err);
      setMessage('Upload failed'); setMessageType('error');
    }
  };

  const addEducation = () => {
    setProfile(prev => ({ ...prev, education: [...(prev.education||[]), { level: '', institution: '', startYear: '', endYear: '', cgpa: '', semesterWise: [], resultFilePath: '' }] }));
  };

  const removeEducation = (idx) => {
    if (!window.confirm('Remove this education entry?')) return;
    setProfile(prev => ({ ...prev, education: (prev.education||[]).filter((_, i) => i !== idx) }));
    // Also remove any pending file selection
    setEducationFiles(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const setField = (idx, key, val) => setProfile(prev => ({ ...prev, education: (prev.education||[]).map((ed, i) => i === idx ? { ...ed, [key]: val } : ed) }));

  const validate = () => {
    const errs = {};
    (profile.education || []).forEach((ed, i) => {
      if (!ed.level || String(ed.level).trim() === '') errs[`education.${i}.level`] = 'Level required';
      if (!ed.institution || String(ed.institution).trim() === '') errs[`education.${i}.institution`] = 'Institution required';
      if (!ed.resultFilePath || String(ed.resultFilePath).trim() === '') errs[`education.${i}.resultFilePath`] = 'Result required';
    });
    return errs;
  };

  const saveAll = async () => {
    setErrors({});
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); setMessage('Fix errors'); setMessageType('error'); return; }
    try {
      const payload = { education: profile.education };
      const res = await patchProfile(payload);
      const u = res.data?.user || res.data;
      if (u) setProfile(u);
      setMessage('Saved'); setMessageType('success');
      try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { __updatedAt: Date.now(), ...(u||{}) } })); } catch(e) {}
    } catch (err) {
      console.error(err);
      setMessage('Save failed'); setMessageType('error');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Academics</h1>
          <div className="text-sm text-gray-500 mt-1">Manage your degrees, upload transcripts, and keep records neat.</div>
        </div>
        <div className="flex gap-3">
          <button onClick={addEducation} className="bg-emerald-600 text-white px-4 py-2 rounded-lg shadow">+ Add Education</button>
          <button onClick={saveAll} className={buttonPrimary}>Save All</button>
        </div>
      </div>

      {message && <div className={`p-3 mb-4 rounded ${messageType==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(profile.education || []).map((ed, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-md border-t-4" style={{borderTopColor: '#6366F1'}}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-indigo-600 font-semibold">{ed.level || 'Education'}</div>
                <div className="text-lg font-semibold mt-1">{ed.institution || 'Institution name'}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-gray-400">#{i+1}</div>
                <button onClick={() => removeEducation(i)} className="text-sm text-red-600">Remove</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <input className={baseInput} placeholder="Level (e.g. Bachelor, Master)" value={ed.level || ''} onChange={e => setField(i, 'level', e.target.value)} />
              <input className={baseInput} placeholder="Institution" value={ed.institution || ''} onChange={e => setField(i, 'institution', e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className={baseInput} placeholder="Start year" value={ed.startYear || ''} onChange={e => setField(i, 'startYear', e.target.value)} />
                <input className={baseInput} placeholder="End year" value={ed.endYear || ''} onChange={e => setField(i, 'endYear', e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Transcript / Result</div>
              <div className="flex items-center gap-3 min-w-0">
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                    <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => handleFile(i, e.target.files?.[0] || null)} />
                    <span className="bg-indigo-600 text-white px-3 py-2 rounded-md shadow-sm">Choose file</span>
                  </label>
                  <div className="flex-1 text-sm text-gray-600 truncate" title={educationFiles[i]?.name || (ed.resultFilePath ? ed.resultFilePath.split('/').pop() : '')}>
                    {educationFiles[i]?.name || (ed.resultFilePath ? ed.resultFilePath.split('/').pop() : 'No file chosen')}
                  </div>
                  <button onClick={() => doUpload(i)} className="bg-emerald-600 text-white px-3 py-2 rounded-md flex-shrink-0">Upload</button>
                  {ed.resultFilePath && (
                    <a className="ml-2 text-indigo-600 flex-shrink-0" href={resolveAsset(ed.resultFilePath)} target="_blank" rel="noreferrer">Download</a>
                  )}
                </div>
              {errors[`education.${i}.resultFilePath`] && <div className="text-xs text-red-600 mt-2">{errors[`education.${i}.resultFilePath`]}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyAcademics;
import React, { useState, useEffect } from "react";
import { getCareer, updateCareer, uploadResume, downloadResume, getProfile, patchProfile } from "../services/api";

const MyCareer = () => {
  const [form, setForm] = useState({
    careerGoal: "",
    preferredRole: "",
    expectedSalary: "",
    skills: [],
    certifications: [],
    workExperience: [
      { company: "", role: "", startDate: "", endDate: "", duration: "", description: "", technologies: [] },
    ],
    education: [
      { institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "" },
    ],
    projects: [
      { title: "", description: "", technologies: [], link: "" },
    ],
    achievements: [],
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    fetchCareer();
  }, []);

  const fetchCareer = async () => {
    setError("");
    try {
        // fetch career doc + profile and merge so skill/experience come from profile when available
        const [careerRes, profileRes] = await Promise.allSettled([getCareer(), getProfile()]);
        const careerData = careerRes.status === 'fulfilled' ? (careerRes.value.data || {}) : {};
        const profileData = profileRes.status === 'fulfilled' ? (profileRes.value.data || {}) : {};

        // computeDuration helper (shared)
        const computeDuration = (start, end) => {
          if (!start && !end) return "";
          try {
            const s = start ? new Date(start) : null;
            const e = end ? new Date(end) : new Date();
            if (s && isNaN(s)) return "";
            if (e && isNaN(e)) return "";
            if (!s) return "Until " + e.toLocaleDateString();
            const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
            const yrs = Math.floor(months / 12);
            const remMonths = months % 12;
            let parts = [];
            if (yrs > 0) parts.push(yrs + (yrs === 1 ? " yr" : " yrs"));
            if (remMonths > 0) parts.push(remMonths + (remMonths === 1 ? " mo" : " mos"));
            return parts.join(" ");
          } catch { return ""; }
        };

        // Format a value into yyyy-MM-dd suitable for <input type="date" />
        const formatDateForInput = (v) => {
          if (!v && v !== 0) return "";
          try {
            // if already like 'YYYY-MM-DD' return first 10 char
            if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
            // if ISO string with time, take first 10 chars
            if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.substring(0,10);
            // Date instance
            if (v instanceof Date && !isNaN(v)) {
              const y = v.getFullYear();
              const m = String(v.getMonth() + 1).padStart(2,'0');
              const d = String(v.getDate()).padStart(2,'0');
              return `${y}-${m}-${d}`;
            }
            // numeric year -> treat as Jan 1
            if (typeof v === 'number' && v > 1900 && v < 3000) return `${v}-01-01`;
            // try parseable string
            const parsed = new Date(v);
            if (!isNaN(parsed)) {
              const y = parsed.getFullYear();
              const m = String(parsed.getMonth() + 1).padStart(2,'0');
              const d = String(parsed.getDate()).padStart(2,'0');
              return `${y}-${m}-${d}`;
            }
          } catch (e){}
          return "";
        };

        const mapExperience = (arr) => {
          if (!Array.isArray(arr)) return [{ company: "", role: "", startDate: "", endDate: "", duration: "", description: "", technologies: [] }];
          return arr.map((ex) => {
            // try multiple possible date field names
            const start = ex.startDate || ex.from || ex.start || ex.start_year || ex.startYear || ex.start_date || ex.begin || ex.beginDate || "";
            const end = ex.endDate || ex.to || ex.end || ex.end_year || ex.endYear || ex.end_date || ex.finish || "";
            const startForInput = formatDateForInput(start);
            const endForInput = formatDateForInput(end);
            const durationFromFields = computeDuration(start, end);
            // if experience already has duration text, use it as fallback
            const duration = durationFromFields || ex.duration || ex.period || "";
            // if duration contains a dash like 'Jan 2020 - Feb 2021', attempt to parse
            if (!durationFromFields && typeof ex.duration === 'string' && ex.duration.includes('-')) {
              const parts = ex.duration.split('-').map(p => p.trim());
              if (parts.length === 2) {
                // attempt to parse dates
                try {
                  const s = new Date(parts[0]);
                  const e = new Date(parts[1]);
                  if (!isNaN(s) && !isNaN(e)) {
                    // recompute human friendly duration
                    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
                    const yrs = Math.floor(months / 12);
                    const remMonths = months % 12;
                    let parts2 = [];
                    if (yrs > 0) parts2.push(yrs + (yrs === 1 ? " yr" : " yrs"));
                    if (remMonths > 0) parts2.push(remMonths + (remMonths === 1 ? " mo" : " mos"));
                    // override duration
                    ex._computedDuration = parts2.join(' ');
                  }
                } catch {}
              }
            }
            return {
              company: ex.company || ex.companyName || "",
              role: ex.role || ex.title || "",
              // ensure values bound to date inputs are in yyyy-MM-dd format
              startDate: startForInput || (start ? formatDateForInput(start) : ""),
              endDate: endForInput || (end ? formatDateForInput(end) : ""),
              duration: ex._computedDuration || duration,
              description: ex.description || ex.summary || "",
              technologies: Array.isArray(ex.technologies) && ex.technologies.length ? ex.technologies : (Array.isArray(ex.skills) ? ex.skills : []),
            };
          });
        };

        // prefer Career doc for career-specific fields but prefer User profile for rich experience data
        const merged = {
          ...form,
          careerGoal: careerData.careerGoal || form.careerGoal || "",
          preferredRole: careerData.preferredRole || profileData.preferredRole || form.preferredRole || "",
          expectedSalary: careerData.expectedSalary || profileData.expectedSalary || form.expectedSalary || "",
          skills: Array.isArray(profileData.skills) && profileData.skills.length ? profileData.skills : (Array.isArray(careerData.skills) ? careerData.skills : []),
          workExperience: Array.isArray(profileData.experience) && profileData.experience.length ? mapExperience(profileData.experience) : (Array.isArray(careerData.experience) ? mapExperience(careerData.experience) : [{ company: "", role: "", startDate: "", endDate: "", duration: "", description: "", technologies: [] }]),
          education: Array.isArray(profileData.education) && profileData.education.length ? profileData.education : (Array.isArray(careerData.education) ? careerData.education : [{ institution: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "" }]),
          projects: Array.isArray(careerData.projects) && careerData.projects.length ? careerData.projects : [{ title: "", description: "", technologies: [], link: "" }],
          achievements: Array.isArray(careerData.achievements) ? careerData.achievements : [],
          resumeUrl: careerData.resumeUrl || profileData.resumeFilePath || "",
        };
        setForm(merged);
        setResumeName(careerData.resumeUrl ? careerData.resumeUrl.split("/").pop() : (profileData.resumeFilePath ? profileData.resumeFilePath.split("/").pop() : ""));
      } catch {
        setError("Failed to fetch career info");
      }
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm({ ...form, [name]: value });
    };

    const handleNestedChange = (index, field, value, key) => {
      const updatedArray = [...form[key]];
      updatedArray[index][field] = value;
      // if editing start/end date, recalc duration
      if (key === "workExperience" && (field === "startDate" || field === "endDate")) {
        const start = updatedArray[index].startDate;
        const end = updatedArray[index].endDate;
        const computeDuration = (start, end) => {
          if (!start && !end) return "";
          try {
            const s = start ? new Date(start) : null;
            const e = end ? new Date(end) : new Date();
            const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
            const yrs = Math.floor(months / 12);
            const remMonths = months % 12;
            let parts = [];
            if (yrs > 0) parts.push(yrs + (yrs === 1 ? " yr" : " yrs"));
            if (remMonths > 0) parts.push(remMonths + (remMonths === 1 ? " mo" : " mos"));
            return parts.join(" ");
          } catch { return ""; }
        };
        updatedArray[index].duration = computeDuration(start, end);
      }
      setForm({ ...form, [key]: updatedArray });
    };

    const addNestedField = (key, newField) => {
      setForm({ ...form, [key]: [...form[key], newField] });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError(""); setSuccess("");
      try {
        // Map our `form` to the backend Career model shape
        const careerPayload = {
          careerGoal: form.careerGoal,
          preferredRole: form.preferredRole,
          expectedSalary: form.expectedSalary,
          skills: Array.isArray(form.skills) ? form.skills : [],
          education: Array.isArray(form.education) ? form.education : [],
          projects: Array.isArray(form.projects) ? form.projects : [],
          achievements: Array.isArray(form.achievements) ? form.achievements : [],
          // career model stores a simple experience array; convert workExperience
          experience: (Array.isArray(form.workExperience) ? form.workExperience : []).map((we) => ({
            company: we.company || "",
            role: we.role || "",
            duration: we.duration || (we.startDate ? (we.endDate ? `${we.startDate} - ${we.endDate}` : `${we.startDate} - Present`) : ""),
            description: we.description || "",
          })),
        };
        const res = await updateCareer(careerPayload);
        // also sync important fields to profile (skills, experience, education, preferredRole, expectedSalary)
        try {
          const profilePayload = {};
          if (Array.isArray(form.skills)) profilePayload.skills = form.skills;
          if (Array.isArray(form.workExperience)) profilePayload.experience = form.workExperience;
          if (Array.isArray(form.education)) profilePayload.education = form.education;
          if (form.preferredRole !== undefined) profilePayload.preferredRole = form.preferredRole;
          if (form.expectedSalary !== undefined) profilePayload.expectedSalary = form.expectedSalary;
          if (Object.keys(profilePayload).length) await patchProfile(profilePayload);
        } catch (syncErr) {
          console.warn('Profile sync failed', syncErr);
        }
        setSuccess("Career profile updated successfully");
        fetchCareer();
      } catch {
        setError("Failed to update career profile");
      }
    };

    const handleResumeUpload = async () => {
      setError(""); setSuccess("");
      if (!resumeFile) return setError("Please select a PDF file");
      try {
        await uploadResume(resumeFile);
        setSuccess("Resume uploaded successfully");
        setResumeFile(null);
        fetchCareer();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to upload resume");
      }
    };

    const handleResumeDownload = async () => {
      setError("");
      try {
        const res = await downloadResume();
        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = resumeName || "resume.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch {
        setError("Failed to download resume");
      }
    };

    const addSkill = () => {
      if (skillInput.trim()) {
        const newSkills = [...(form.skills||[]), skillInput.trim()];
        setForm({ ...form, skills: newSkills });
        setSkillInput("");
        // optimistic local update and sync to profile
        try { patchProfile({ skills: newSkills }).catch(() => {}); } catch(e) {}
      }
    };

    const removeSkill = (idx) => {
      const newSkills = (form.skills||[]).filter((_, i) => i !== idx);
      setForm({ ...form, skills: newSkills });
      try { patchProfile({ skills: newSkills }).catch(() => {}); } catch(e) {}
    };

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">My Career Profile</h1>
            <p className="text-sm text-gray-500">A colorful, organized view of your resume, goals, and experience.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-violet-600 text-white shadow">Save</button>
          </div>
        </div>

        {error && <div className="text-red-600 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left column: Resume + Summary - keep modest min width so it remains visible with sidebar open */}
          <div className="space-y-4 md:col-span-1 md:min-w-[300px]">
            <div className="bg-white rounded-2xl shadow p-4 border-l-8 overflow-hidden" style={{borderLeftColor: '#8B5CF6'}}>
              <div className="flex items-center justify-between min-w-0">
                <div>
                  <div className="text-sm text-violet-600 font-semibold">Resume</div>
                  <div className="text-lg font-semibold mt-1">Upload & extract</div>
                </div>
                <div className="text-sm text-gray-400 max-w-[220px] truncate" title={resumeName}>{resumeName || 'No file'}</div>
              </div>
                <div className="mt-4">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <label className="cursor-pointer flex-shrink-0">
                    <input type="file" accept="application/pdf" className="hidden" onChange={e => setResumeFile(e.target.files[0])} />
                    <div className="bg-violet-600 text-white px-4 py-2 rounded-lg shadow">Choose File</div>
                  </label>
                  <div className="flex-1 text-sm text-gray-600 truncate" title={resumeName}>{resumeName || 'No file chosen'}</div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={handleResumeUpload} className="bg-emerald-500 text-white px-4 py-2 rounded-lg">{resumeName ? 'Replace' : 'Upload'}</button>
                    <button onClick={handleResumeDownload} className="bg-sky-500 text-white px-3 py-2 rounded-lg">Download</button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Upload a PDF to trigger skill extraction and auto-fill skills.</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 border-l-8" style={{borderLeftColor: '#06B6D4'}}>
              <div className="text-sm text-sky-600 font-semibold">Quick Overview</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-sky-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Skills</div>
                  <div className="font-semibold text-sky-700">{(form.skills||[]).length}</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Experience</div>
                  <div className="font-semibold text-emerald-700">{(form.workExperience||[]).length} items</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-500">Preferred Role</div>
                <div className="font-medium">{form.preferredRole || '—'}</div>
              </div>
            </div>
          </div>

          {/* Main column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow p-5 border-l-8" style={{borderLeftColor: '#F472B6'}}>
              <div className="text-sm text-pink-600 font-semibold">Career Goal</div>
              <textarea name="careerGoal" value={form.careerGoal} onChange={handleChange} className="w-full border p-3 rounded-lg mt-3" rows={4} />
            </div>

            <div className="bg-white rounded-2xl shadow p-5 border-l-8" style={{borderLeftColor: '#F59E0B'}}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-amber-600 font-semibold">Job Preferences</div>
                </div>
                <div className="text-sm text-gray-400">Editable</div>
              </div>
              <div className="mt-4 grid md:grid-cols-2 gap-3">
                <input type="text" name="preferredRole" placeholder="Preferred Role" value={form.preferredRole} onChange={handleChange} className="border p-3 rounded-lg" />
                <input type="text" name="expectedSalary" placeholder="Expected Salary" value={form.expectedSalary} onChange={handleChange} className="border p-3 rounded-lg" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-5 border-l-8" style={{borderLeftColor: '#10B981'}}>
              <div className="flex items-center justify-between">
                <div className="text-sm text-emerald-600 font-semibold">Skills</div>
                <div className="text-xs text-gray-400">Add or remove</div>
              </div>
              <div className="mt-3 flex gap-3">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} className="border p-2 rounded-lg flex-1" placeholder="Add a skill (e.g. React)" />
                <button type="button" onClick={addSkill} className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Add</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(form.skills||[]).map((skill, index) => (
                  <div key={index} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                    <div className="text-sm">{skill}</div>
                    <button onClick={() => removeSkill(index)} className="text-xs text-red-500">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-5 border-l-8" style={{borderLeftColor: '#6366F1'}}>
              <div className="text-sm text-indigo-600 font-semibold">Work Experience</div>
              <div className="mt-3 space-y-4">
                {(Array.isArray(form.workExperience) ? form.workExperience : []).map((exp, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{exp.company || 'Company'}</div>
                        <div className="text-sm text-gray-600">{exp.role || 'Role'}</div>
                      </div>
                      <div className="text-sm text-gray-500">{exp.duration || ''}</div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <input type="date" placeholder="Start Date" value={exp.startDate || ''} onChange={e => handleNestedChange(index, 'startDate', e.target.value, 'workExperience')} className="border p-2 rounded-lg" />
                      <input type="date" placeholder="End Date" value={exp.endDate || ''} onChange={e => handleNestedChange(index, 'endDate', e.target.value, 'workExperience')} className="border p-2 rounded-lg" />
                    </div>
                    <textarea placeholder="Description" value={exp.description || ''} onChange={e => handleNestedChange(index, 'description', e.target.value, 'workExperience')} className="border p-3 rounded-lg w-full mt-3" />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(exp.technologies || []).map((t, i) => (
                        <span key={i} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <button type="button" onClick={() => addNestedField("workExperience", { company: "", role: "", startDate: "", endDate: "", duration: "", description: "", technologies: [] })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">+ Add Work Experience</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  export default MyCareer;

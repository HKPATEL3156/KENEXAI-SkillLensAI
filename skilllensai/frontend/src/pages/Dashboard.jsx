import React, { useEffect, useState } from "react";
import { getProfile, getCareer } from "../services/api";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../assets/default-avatar.svg";

// Small helpers
const backendBase = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";
const resolveAsset = (p) => {
  if (!p) return "";
  if (p.startsWith("/uploads") || p.startsWith("uploads")) return backendBase + (p.startsWith("/") ? p : `/${p}`);
  return p;
};

const formatDate = (s) => {
  if (!s) return "-";
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
};

const splitSkills = (skills = []) => {
  // Simple heuristic categorization using keyword lists
  const tech = [];
  const tools = [];
  const soft = [];
  const toolKeys = ["react","next","vue","angular","docker","kubernetes","aws","azure","gcp","git","github","node","express","django","flask","tensorflow","pytorch","sql","mongodb","redis","bootstrap","tailwind"];
  const softKeys = ["communication","teamwork","leadership","problem","management","organisational","collaboration","critical","adaptability"];
  (skills || []).forEach((s) => {
    const lower = String(s).toLowerCase();
    if (softKeys.some(k => lower.includes(k))) soft.push(s);
    else if (toolKeys.some(k => lower.includes(k))) tools.push(s);
    else tech.push(s);
  });
  return { tech, tools, soft };
};

const CircularProgress = ({ percent = 0, size = 96, stroke = 8 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <g transform={`translate(${size/2}, ${size/2})`}>
        <circle r={r} fill="transparent" stroke="#eef2ff" strokeWidth={stroke} />
        <circle r={r} fill="transparent" stroke="url(#grad)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} transform="rotate(-90)" />
        <text x="0" y="4" textAnchor="middle" fontSize="18" fontWeight="700" fill="#111827">{Math.round(percent)}%</text>
      </g>
    </svg>
  );
};

const Icon = ({ name, className = "w-6 h-6" }) => {
  // Minimal inline icons by name
  if (name === 'upload') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 7l4-4 4 4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21H3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (name === 'skills') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l2.09 6.26L20 9.27l-5 3.64L16.18 20 12 16.9 7.82 20 9 12.91 4 9.27l5.91-.99L12 2z" strokeWidth="0" fill="#3b82f6"/></svg>
  );
  if (name === 'profile') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM3 21a9 9 0 0 1 18 0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (name === 'analysis') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 13v6M12 9v10M17 5v14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  return <svg className={className}></svg>;
};

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [pRes, cRes] = await Promise.allSettled([getProfile(), getCareer()]);
        const p = pRes.status === 'fulfilled' ? (pRes.value.data?.user || pRes.value.data) : null;
        const c = cRes.status === 'fulfilled' ? (cRes.value.data || null) : null;
        if (!mounted) return;
        setProfile(p);
        setCareer(c || {});
      } catch (e) {
        console.error('dashboard load', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const userName = profile?.fullName || profile?.firstName || profile?.username || 'Student';
  const headline = profile?.headline || 'Student • Aspiring Professional';
  const avatar = resolveAsset(profile?.profileImage || profile?.profilePhoto) || defaultAvatar;

  // profile completion heuristics
  const resumeUploaded = Boolean(career?.resumeUrl || profile?.resumeFilePath || profile?.career?.resumeFilePath);
  const skillsCount = Array.isArray(profile?.skills) ? profile.skills.length : 0;
  const skillsExtracted = skillsCount > 0;
  const educationAdded = Array.isArray(profile?.education) && profile.education.length > 0;
  const profileDetails = Boolean(profile?.fullName && profile?.headline && profile?.primaryLocation);
  const completeScore = Math.min(100, Math.round(((resumeUploaded ? 25 : 0) + (skillsExtracted ? 25 : 0) + (educationAdded ? 25 : 0) + (profileDetails ? 25 : 0))));

  const { tech, tools, soft } = splitSkills(profile?.skills || []);

  // skill insights
  const freqMap = {};
  (profile?.skills || []).forEach(s => { freqMap[s] = (freqMap[s] || 0) + 1; });
  const sortedSkills = Object.keys(freqMap).sort((a,b) => freqMap[b]-freqMap[a]);
  const top3 = sortedSkills.slice(0,3);
  const mostFreq = sortedSkills[0] || null;

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <section className="rounded-2xl p-6 mb-6 bg-white shadow-sm border-l-4 border-indigo-500">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back, {userName} 👋</h2>
            <div className="text-sm text-gray-600 mt-2">{headline}</div>
            <p className="mt-3 text-gray-500">Keep your profile up-to-date — upload a resume and extract skills to get personalized career guidance.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-4 hidden md:block">
              <div className="text-xs text-gray-500">Profile completion</div>
              <div className="text-lg font-semibold text-gray-800">{completeScore}%</div>
            </div>
            <img src={avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover ring-2 ring-white shadow-md" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Profile Completion Card */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md flex items-center gap-6">
          <div>
            <CircularProgress percent={completeScore} size={112} stroke={10} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Profile Completion</h3>
            <p className="text-sm text-gray-500 mt-1">Complete the sections below to increase your chances with recruiters.</p>
            <ul className="mt-4 space-y-2">
              <li className={`flex items-center gap-3 ${resumeUploaded ? 'text-green-600' : 'text-red-500'}`}>
                <span className={`w-3 h-3 rounded-full ${resumeUploaded ? 'bg-green-500' : 'bg-red-500'}`} /> Resume Uploaded
              </li>
              <li className={`flex items-center gap-3 ${skillsExtracted ? 'text-green-600' : 'text-red-500'}`}>
                <span className={`w-3 h-3 rounded-full ${skillsExtracted ? 'bg-green-500' : 'bg-red-500'}`} /> Skills Extracted
              </li>
              <li className={`flex items-center gap-3 ${educationAdded ? 'text-green-600' : 'text-red-500'}`}>
                <span className={`w-3 h-3 rounded-full ${educationAdded ? 'bg-green-500' : 'bg-red-500'}`} /> Education Added
              </li>
              <li className={`flex items-center gap-3 ${profileDetails ? 'text-green-600' : 'text-red-500'}`}>
                <span className={`w-3 h-3 rounded-full ${profileDetails ? 'bg-green-500' : 'bg-red-500'}`} /> Profile Details Completed
              </li>
            </ul>
            <div className="mt-4">
              <button onClick={() => nav('/profile')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow">Complete Profile</button>
            </div>
          </div>
        </div>

        {/* Resume Status Card */}
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Resume Status</h4>
            <div className={`rounded-full px-3 py-1 text-sm ${resumeUploaded ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{resumeUploaded ? 'Uploaded' : 'Not Uploaded'}</div>
          </div>
          <div className="mt-4 text-sm text-gray-600">Uploaded: {resumeUploaded ? (career?.resumeUrl ? formatDate(career?.updatedAt || career?.updatedAt) : formatDate(profile?.resumeUploadedAt || profile?.updatedAt || profile?.registrationDate)) : '-'}</div>
          <div className="mt-2 text-sm text-gray-600">Extracted skills: <span className="font-semibold">{skillsCount}</span></div>
          <div className="mt-4">
            <button onClick={() => nav('/career')} className="w-full bg-white border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded">Re-upload Resume</button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div onClick={() => nav('/dashboard/career')} className="cursor-pointer bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition flex items-center gap-3 border-l-4 border-indigo-400">
          <div className="p-3 bg-indigo-50 rounded"> <Icon name="upload" /> </div>
          <div>
            <div className="text-sm font-semibold">Upload Resume</div>
            <div className="text-xs text-gray-500">Extract skills from your resume</div>
          </div>
        </div>
        <div onClick={() => nav('/dashboard/activity')} className="cursor-pointer bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition flex items-center gap-3 border-l-4 border-emerald-400">
          <div className="p-3 bg-emerald-50 rounded"> <Icon name="skills" /> </div>
          <div>
            <div className="text-sm font-semibold">My Activity</div>
            <div className="text-xs text-gray-500">Recent actions & feed</div>
          </div>
        </div>
        <div onClick={() => nav('/dashboard/profile')} className="cursor-pointer bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition flex items-center gap-3 border-l-4 border-sky-400">
          <div className="p-3 bg-sky-50 rounded"> <Icon name="profile" /> </div>
          <div>
            <div className="text-sm font-semibold">Edit Profile</div>
            <div className="text-xs text-gray-500">Update personal details</div>
          </div>
        </div>
        <div onClick={() => nav('/dashboard/coach')} className="cursor-pointer bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition flex items-center gap-3 border-l-4 border-fuchsia-400">
          <div className="p-3 bg-fuchsia-50 rounded"> <Icon name="analysis" /> </div>
          <div>
            <div className="text-sm font-semibold">SkillLens Coach</div>
            <div className="text-xs text-gray-500">AI guidance & insights</div>
          </div>
        </div>
      </div>

      {/* Skills and insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Extracted Skills <span className="text-sm text-gray-500">({skillsCount})</span></h3>
            <button onClick={() => nav('/skills')} className="text-sm text-indigo-600">Edit skills</button>
          </div>
          <div className="mt-4">
            <div className="mb-3 text-sm font-medium">Technical Skills</div>
            <div className="flex flex-wrap gap-2">{tech.map((s,i) => (
              <div key={i} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                <span>{s}</span>
                <button title="Remove" className="text-indigo-500 opacity-70 hover:opacity-100">×</button>
              </div>
            ))}</div>
            <div className="mt-4 mb-3 text-sm font-medium">Tools & Frameworks</div>
            <div className="flex flex-wrap gap-2">{tools.map((s,i) => (
              <div key={i} className="flex items-center gap-2 bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-sm">
                <span>{s}</span>
                <button title="Remove" className="text-sky-500 opacity-70 hover:opacity-100">×</button>
              </div>
            ))}</div>
            <div className="mt-4 mb-3 text-sm font-medium">Soft Skills</div>
            <div className="flex flex-wrap gap-2">{soft.map((s,i) => (
              <div key={i} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm">
                <span>{s}</span>
                <button title="Remove" className="text-amber-500 opacity-70 hover:opacity-100">×</button>
              </div>
            ))}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold">Skill Insights</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Top 3 Skills</div>
                <div className="font-semibold">{top3.length ? top3.join(', ') : 'No data'}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Most frequent</div>
              <div className="font-semibold">{mostFreq || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Skill distribution</div>
              <div className="h-24 flex items-end gap-2 mt-2">
                {(top3.length ? top3 : ['-','-','-']).map((k, i) => (
                  <div key={i} className="flex-1 bg-indigo-100 rounded" style={{height: `${(freqMap[k] || 1) * 20}px`}} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Future modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-inner text-gray-400 opacity-80 border border-dashed">
          <div className="text-lg font-semibold">Skill Validation Quiz <span className="text-sm text-gray-400">Coming Soon</span></div>
          <div className="mt-2 text-sm">Short quizzes to validate your claimed skills and provide badges.</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-inner text-gray-400 opacity-80 border border-dashed">
          <div className="text-lg font-semibold">Career Recommendation <span className="text-sm text-gray-400">Coming Soon</span></div>
          <div className="mt-2 text-sm">Personalized career paths and role recommendations based on your profile.</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

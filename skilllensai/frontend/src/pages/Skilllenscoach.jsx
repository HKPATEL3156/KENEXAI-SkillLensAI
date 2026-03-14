
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api, { getQuestions, startQuiz, submitQuiz, getQuizAttempts } from "../services/api";

const Step = ({ idx, title, open, onToggle, locked, children }) => (
  <div className={`rounded-xl shadow-md mb-5 transition-all duration-200 bg-white border border-gray-200 ${open ? 'ring-2 ring-blue-500' : ''}`}
    style={{ overflow: 'hidden' }}>
    <button
      className="w-full flex items-center justify-between px-5 py-4 focus:outline-none"
      onClick={locked ? undefined : onToggle}
      aria-expanded={open}
      style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${locked ? 'bg-gray-300 text-gray-400' : 'bg-blue-600 text-white shadow'}`}>{idx}</div>
        <div className="font-semibold text-lg text-gray-900">{title}</div>
      </div>
      <div className="flex items-center gap-2">
        {locked ? <span className="text-sm text-gray-400">Locked</span> : <span className="text-2xl text-gray-400">{open ? '−' : '+'}</span>}
      </div>
    </button>
    {open && !locked && (
      <div className="px-5 pb-5 pt-2 animate-fadein">
        {children}
      </div>
    )}
  </div>
);

const SkillLensCoach = () => {
  const [skills, setSkills] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [openStep, setOpenStep] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');
  const [starting, setStarting] = useState(false);
  const [genJobId, setGenJobId] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [career, setCareer] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionResult, setSuggestionResult] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetch = async () => {
      try {
        const s = await api.get("/career/skills");
        setSkills(s.data.skills || []);
      } catch (e) {}
      try {
        const me = await api.get("/career/me");
        setCareer(me.data || null);
        if (me.data && Array.isArray(me.data.selectedSkills)) setSelected(me.data.selectedSkills || []);
      } catch (e) {}
      try {
        // load selected skills from quiz service (persisted)
        const ss = await api.get('/quiz/selected-skills');
        if (ss.data && Array.isArray(ss.data.skills)) setSelected(ss.data.skills || []);
      } catch (e) {}
      try {
        // Fetch full user profile which often contains detailed education/cgpa fields
        const p = await api.get("/profile/me");
        setProfileData(p.data || null);
      } catch (e) {
        // non-fatal
      }
      try {
        const res = await getQuizAttempts();
        setAttempts(res.data.attempts || []);
      } catch (e) {}
    };
    fetch();
  }, []);

  useEffect(() => {
    if (location.state && location.state.marks !== undefined) {
      alert(`Quiz completed: ${location.state.marks} marks`);
      // refresh attempts
      getQuizAttempts().then((r) => setAttempts(r.data.attempts || [])).catch(()=>{});
      // clear state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const toggleSkill = (skill) => {
    if (selected.includes(skill)) setSelected(selected.filter((s) => s !== skill));
    else setSelected([...selected, skill]);
  };

  const saveSkills = async () => {
    try {
      setLoading(true);
      await api.post('/quiz/selected-skills', { skills: selected });
      alert("Skills saved");
    } catch (e) {
      alert("Error saving skills");
    } finally {
      setLoading(false);
    }
  };

  const resetSkills = async () => {
    try {
      setSelected([]);
      await api.post('/quiz/selected-skills', { skills: [] });
    } catch (e) {}
  };

  const handleStartQuiz = async () => {
    if (selected.length === 0) return alert("Select at least one skill first");
    if (generating || starting) return; // prevent re-entrancy
    try {
      setGenerating(true);
      setStarting(false);
      setGenMessage('Generating question paper...');
      // trigger generation job
      const genResp = await api.post('/quiz/generate', { skills: selected });
      const jobId = genResp.data.jobId;
      setGenJobId(jobId);

      // poll status until completed or failed (no fixed timeout). If status endpoint missing (404),
      // fallback to polling the presence of questionpaper.json via /quiz/paper-status.
      let status = null;
      let backoff = 1000; // start 1s
      let pollCount = 0;
      let usePaperFallback = false;
      while (true) {
        try {
          const st = await api.get(`/quiz/generate/status?jobId=${jobId}`);
          status = st.data.status;
          pollCount += 1;
          if (status === 'completed') break;
          if (status === 'failed') throw new Error(st.data.error || 'generation failed');
          setGenMessage(`Waiting for generation: ${status} (poll ${pollCount})`);
        } catch (statusErr) {
          // if 404, enable fallback mode to poll for the generated file
          if (statusErr.response && statusErr.response.status === 404) {
            usePaperFallback = true;
            setGenMessage('Waiting for question paper (fallback) ...');
            break;
          }
          throw statusErr;
        }
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(10000, Math.round(backoff * 1.5));
      }

      // fallback: poll for paper file if needed
      if (usePaperFallback) {
        let paperBackoff = 1000;
        while (true) {
          const ps = await api.get('/quiz/paper-status');
          if (ps.data && ps.data.exists) break;
          setGenMessage(`Waiting for question paper (file not yet present) ...`);
          await new Promise((r) => setTimeout(r, paperBackoff));
          paperBackoff = Math.min(10000, Math.round(paperBackoff * 1.5));
        }
      }
      // start the quiz after generation completes
      setGenMessage('Starting quiz...');
      setStarting(true);
      const resp = await startQuiz({ skills: selected, quizName: "SkillLens Quiz" });
      const { attemptId } = resp.data;
      navigate(`/exam?attemptId=${attemptId}`);
    } catch (e) {
      console.error(e);
      // attempt to fetch logs for job
      try {
        if (genJobId) {
          const logs = await api.get(`/quiz/generate/logs?jobId=${genJobId}`);
          const out = logs.data.stdout || '';
          const err = logs.data.stderr || logs.data.error || '';
          alert(`Generation failed: ${e.message}\n\nLogs:\n${err || out || 'no logs'}`);
        } else {
          alert(`Failed to start quiz: ${e.message || 'Server error'}`);
        }
      } catch (le) {
        alert(`Failed to start quiz: ${e.message || 'Server error'}`);
      }
    } finally {
      setGenerating(false);
      setStarting(false);
      setGenMessage('');
      setGenJobId(null);
    }
  };

  // Helper: extract CGPAs from career profile (safe): looks for career.education array
  // Helper: extract CGPAs from career profile (safe).
  // Returns array of { level, cgpa, board } for each education entry that has a cgpa-like field.
  function extractCgpas(careerProfile, userProfile) {
    // Combine career document education (which may be minimal) with full user profile education
    const careerEdu = careerProfile && Array.isArray(careerProfile.education) ? careerProfile.education : [];
    const userEdu = userProfile && Array.isArray(userProfile.education) ? userProfile.education : [];
    const maxLen = Math.max(careerEdu.length, userEdu.length);
    const out = [];

    for (let i = 0; i < maxLen; i++) {
      const c = careerEdu[i] || {};
      const u = userEdu[i] || {};
      // merged view: user profile fields take precedence for cgpa details
      const merged = { ...c, ...u };

      // direct cgpa-like fields
      const direct = merged.cgpa ?? merged.CGPA ?? merged.gpa ?? merged.grade;
      let cgpaVal = null;
      if (direct !== undefined && direct !== null) {
        const n = parseFloat(String(direct).replace(/[^0-9.]/g, ""));
        if (!Number.isNaN(n) && n > 0) cgpaVal = n;
      }

      // fallback: compute avg from semesterWise / semesterWise.sgpa
      if (cgpaVal === null && Array.isArray(merged.semesterWise) && merged.semesterWise.length) {
        const svals = merged.semesterWise
          .map((s) => (s && typeof s === 'object' ? (s.sgpa ?? s.sgpa) : parseFloat(s) || 0))
          .filter((n) => !Number.isNaN(n) && n > 0);
        if (svals.length) {
          const avg = svals.reduce((a, b) => a + b, 0) / svals.length;
          cgpaVal = Number(avg.toFixed(2));
        }
      }

      if (cgpaVal !== null) {
        out.push({ level: merged.level || merged.degree || merged.institution || `Education ${i + 1}`, cgpa: cgpaVal, board: merged.boardUniversity || merged.board || merged.institution || '' });
      }
    }

    return out;
  }

  // Submit result report: posts academic and skill grades
  const submitResultReport = async () => {
    // compute cgpas and grades (merge career and profile data)
    const cgpas = extractCgpas(career, profileData);
    const avgCgpa = cgpas.length ? (cgpas.reduce((a,b)=>a+b.cgpa,0)/cgpas.length) : 0;
    const academicGrade = Math.min(100, Number((avgCgpa * 10).toFixed(2)));
    // compute skill grade using the latest submitted attempt's average (not average across attempts)
    const submittedAttempts = attempts.filter(a => a.status === 'submitted').slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
    const latestAttempt = submittedAttempts[0];
    const latestSkill = latestAttempt ? (latestAttempt.obtainedMarks ?? latestAttempt.totalMarks ?? 0) : 0;
    const skillGrade = latestSkill; // raw skill marks from latest attempt
    const avgGrade = Number(((academicGrade + Number(skillGrade)) / 2).toFixed(2));

    const payload = {
      academicGrade,
      skillGrade,
      avgGrade,
      cgpas,
      submittedAt: new Date().toISOString(),
    };

    try {
      // try to post to backend endpoint if exists
      await api.post('/career/submit-result', payload).catch(()=>{});
      alert('Result report submitted');
      // refresh attempts or state if needed
    } catch (e) {
      console.error(e);
      alert('Failed to submit report (frontend only)');
    }
  };

  // lock logic: step1 unlocked if skills extracted present; step2 unlocked if selectedSkills saved or selected non-empty; step3 unlocked if a submitted attempt exists; step4 unlocked if step3 and result report exists
  const step1Done = skills && skills.length > 0;
  // step2 is unlocked only after step1 is done
  const step1Locked = false;
  const step2Locked = !step1Done;

  // step3 (Result Report) unlocked only when there is at least one submitted attempt
  const hasSubmittedAttempt = attempts.some((a) => a.status === 'submitted');
  const step3Locked = !hasSubmittedAttempt;
  const step3Done = hasSubmittedAttempt;
  const step4Locked = !step3Done;


  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {(generating || starting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-3 shadow-lg">
            <div className="animate-spin rounded-full border-4 border-t-4 border-gray-200 border-t-blue-600 h-12 w-12"></div>
            <div className="text-lg font-semibold">{genMessage || (starting ? 'Starting quiz...' : 'Generating question paper...')}</div>
            <div className="text-sm text-gray-500">Please wait — this may take up to a minute.</div>
          </div>
        </div>
      )}
      {/* Header: Premium name + info */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-8 px-8 flex flex-col md:flex-row items-center md:justify-between rounded-b-3xl shadow-lg mb-8">
        <div className="flex items-center gap-5">
          {/* Logo image: place your logo at `/public/logo.png` or adjust the path below */}
          {!logoError ? (
            <img
              src="/logo.png"
              alt="SkillLens logo"
              className="w-16 h-16 object-cover shadow-lg"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-16 h-16 bg-white/80 flex items-center justify-center shadow-lg" />
          )}
          <div>
            <div className="text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow">SkillLens AI Coach</div>
            <div className="text-lg text-blue-100 mt-2 font-medium">Your guided path to skill assessment and career growth</div>
          </div>
        </div>
        {/* Optional: Add user info, logo, or navigation here */}
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* Steps */}
        <div className="mb-8">
          <Step idx={1} title="Extract Skills from Resume" open={openStep===1} onToggle={() => setOpenStep(openStep===1?null:1)} locked={step1Locked}>
            {!step1Done ? (
              <div className="text-red-500 font-medium">No extracted skills found. Please upload your resume first.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {skills.map((skill,i)=> (
                  <label key={i} className="flex items-center gap-2 border p-2 rounded-lg cursor-pointer bg-gray-50 hover:bg-blue-50 transition">
                    <input type="checkbox" checked={selected.includes(skill)} onChange={()=>toggleSkill(skill)} className="accent-blue-600" />
                    <span className="text-sm font-medium text-gray-800">{skill}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={saveSkills} disabled={loading || selected.length===0} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold shadow disabled:opacity-60">{loading? 'Saving...':'Save Skills'}</button>
              <button onClick={resetSkills} className="bg-gray-200 px-5 py-2 rounded-lg font-semibold">Reset</button>
            </div>
          </Step>

          <Step idx={2} title="Take Skill Quiz" open={openStep===2} onToggle={() => setOpenStep(openStep===2?null:2)} locked={step2Locked}>
            {/* Step 2: Premium, modern design */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#059669"/></svg>
                </div>
                <div className="text-lg font-bold text-gray-800">Ready to test your skills?</div>
              </div>
              <div className="mb-3 text-sm text-gray-700">Selected skills: {selected.length > 0 ? selected.map((s,i) => <span key={i} className="text-blue-700 font-semibold mr-2">{s}</span>) : <span className="text-gray-400">None</span>}</div>
              <button onClick={handleStartQuiz} disabled={generating || starting} className={`px-6 py-2 rounded-lg font-semibold shadow mb-6 ${generating||starting ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>Start Quiz</button>
            </div>
            {/* Quiz Attempts Table: Only in Step 2 */}
            <div className="bg-white rounded-xl shadow border border-blue-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-bold text-blue-700">Your Quiz Attempts</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-blue-50 text-blue-900">
                      <th className="p-3 font-semibold">No</th>
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Skills</th>
                      <th className="p-3 font-semibold">Quiz</th>
                      <th className="p-3 font-semibold">Total</th>
                      <th className="p-3 font-semibold">Obtained</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-gray-400">No quiz attempts yet</td></tr>
                    )}
                    {attempts.map((a, idx) => (
                      <tr key={a._id} className="border-t hover:bg-blue-50 transition">
                        <td className="p-3 font-semibold text-center">{idx+1}</td>
                        <td className="p-3">{new Date(a.createdAt).toLocaleString()}</td>
                        <td className="p-3">{(a.skills||[]).map((s,i)=>(<span key={i} className="text-blue-700 font-semibold mr-1">{s}</span>))}</td>
                        <td className="p-3">{a.quizName}</td>
                        <td className="p-3 text-center">{a.totalMarks || 100}</td>
                        <td className="p-3 text-center font-bold text-green-700">{a.obtainedMarks || 0}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${a.status==='submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Step>

          <Step idx={3} title="Result Report" open={openStep===3} onToggle={() => setOpenStep(openStep===3?null:3)} locked={step3Locked}>
            <div className="text-sm text-gray-700 mb-4">Results combine academic scores and quiz marks. Review the computed grades below and click <span className="font-semibold text-indigo-700">Submit Result Report</span> to push the final report.</div>

            {/* Display education CGPAs */}
            <div className="bg-white p-4 rounded shadow mb-4">
              <div className="text-sm font-semibold mb-2">Academic CGPAs</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(() => {
                  const cgpas = extractCgpas(career, profileData);
                  if (!cgpas || cgpas.length === 0) return <div className="col-span-2 text-gray-500">No CGPA data available in profile.</div>;
                  return cgpas.map((c, i) => (
                    <div key={i} className="p-2 border rounded">{`${c.level || `Education ${i+1}`} ${c.board ? `(${c.board})` : ''}: ${c.cgpa}`}</div>
                  ));
                })()}
              </div>
            </div>

            {/* Latest quiz marks and grade boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-white rounded shadow">
                <div className="text-sm text-gray-500">Latest Quiz Marks</div>
                <div className="text-2xl font-bold text-green-700">{(() => {
                  const latest = attempts.slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))[0];
                  return latest ? (latest.obtainedMarks ?? latest.totalMarks ?? 0) : 'N/A';
                })()}</div>
              </div>

              <div className="p-4 bg-white rounded shadow">
                <div className="text-sm text-gray-500">Academic Grade (out of 100)</div>
                <div className="text-2xl font-bold text-indigo-600">{(() => {
                  const cgpas = extractCgpas(career, profileData);
                  const avgCgpa = cgpas.length ? (cgpas.reduce((sum, item) => sum + (item.cgpa || 0), 0) / cgpas.length) : 0;
                  return Math.min(100, Number((avgCgpa*10).toFixed(2)));
                })()}</div>
              </div>

              <div className="p-4 bg-white rounded shadow">
                <div className="text-sm text-gray-500">Skill Grade (latest avg)</div>
                <div className="text-2xl font-bold text-yellow-600">{(() => {
                  const subs = attempts.filter(a => a.status === 'submitted').slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
                  if (!subs || subs.length === 0) return 'N/A';
                  const latest = subs[0];
                  const cgpas = extractCgpas(career, profileData);
                  const academic = cgpas.length ? (cgpas.reduce((sum, item) => sum + (item.cgpa || 0), 0)/cgpas.length)*10 : 0;
                  const skill = latest ? (latest.obtainedMarks ?? latest.totalMarks ?? 0) : 0;
                  const avg = Number(((academic + Number(skill))/2).toFixed(2));
                  return avg;
                })()}</div>
              </div>
            </div>

            <div className="mb-4">
              <button onClick={submitResultReport} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition">Submit Result Report</button>
            </div>

            {/* Results table built from submitted attempts with computed academic/avg grades */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-base font-semibold mb-3">Submitted Reports</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-gray-100">
                      <th className="p-2">No</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Academic Grade</th>
                      <th className="p-2">Skill Grade</th>
                      <th className="p-2">Avg Grade</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.filter(a=>a.status==='submitted').length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-gray-500">No submitted reports yet</td></tr>
                    )}
                    {attempts.filter(a=>a.status==='submitted').map((a, idx) => {
                      const cgpas = extractCgpas(career, profileData);
                      const academic = cgpas.length ? (cgpas.reduce((sum, item) => sum + (item.cgpa || 0), 0)/cgpas.length)*10 : 0;
                      const skill = a.obtainedMarks ?? a.totalMarks ?? 0;
                      const avg = Number(((academic + Number(skill))/2).toFixed(2));
                      return (
                        <tr key={a._id} className="border-t">
                          <td className="p-2 align-top">{idx+1}</td>
                          <td className="p-2 align-top">{new Date(a.createdAt).toLocaleString()}</td>
                          <td className="p-2 align-top">{Number(academic.toFixed ? academic.toFixed(2) : academic)}</td>
                          <td className="p-2 align-top">{skill}</td>
                          <td className="p-2 align-top">{avg}</td>
                          <td className="p-2 align-top">{a.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Step>

          <Step idx={4} title="Career Recommendation" open={openStep===4} onToggle={() => setOpenStep(openStep===4?null:4)} locked={step4Locked}>
            <div className="text-sm text-gray-700">Recommendations will be shown based on quiz marks and academic score.</div>
            <div className="mt-4">
              {(() => {
                // compute academic grade
                const cgpas = extractCgpas(career, profileData);
                const avgCgpa = cgpas.length ? (cgpas.reduce((sum, item) => sum + (item.cgpa || 0), 0) / cgpas.length) : 0;
                const academicGrade = Math.min(100, Number((avgCgpa * 10).toFixed(2)));

                // compute latest submitted quiz score (percentage-like)
                const submittedAttempts = attempts.filter(a => a.status === 'submitted').slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
                const latest = submittedAttempts[0];
                const quizScore = latest
                  ? ((latest.percentage ?? latest.percent ?? (latest.obtainedMarks && latest.totalMarks ? Math.round((latest.obtainedMarks / latest.totalMarks) * 100) : latest.obtainedMarks)) || 0)
                  : 0;

                const eligible = (Number(quizScore) > 70) && (Number(academicGrade) > 75);

                return (
                  <div className="bg-white rounded-lg p-4 mt-3">
                    <div className="mb-3">
                      <div className="text-sm text-gray-600">Latest quiz score: <span className="font-semibold">{quizScore || 'N/A'}</span></div>
                      <div className="text-sm text-gray-600">Academic grade: <span className="font-semibold">{academicGrade || 'N/A'}</span></div>
                    </div>

                    {eligible ? (
                      <div>
                        <div className="text-green-700 font-bold mb-3">You are eligible for the job</div>
                        <div className="flex items-center gap-3 mb-3">
                          <button onClick={async () => {
                            try {
                              setSuggestionLoading(true); setSuggestionResult(null);
                              // Use axios instance that attaches auth token
                              const resp = await api.get('/career/predict-from-quiz');
                              const json = resp.data;
                              if (resp.status === 200) {
                                const role = json.prediction && (json.prediction.role || json.prediction?.role_name || json.prediction?.roleName || json.prediction?.label) ? (json.prediction.role || json.prediction.role_name || json.prediction.roleName || json.prediction.label) : (json.prediction && json.prediction[0]) || null;
                                setSuggestionResult({ role, usedSkills: json.usedSkills || [] });
                                if (role) {
                                  localStorage.setItem('suggestedRole', role);
                                } else {
                                  localStorage.removeItem('suggestedRole');
                                }
                              } else {
                                setSuggestionResult({ error: json.error || json.message || 'Prediction failed' });
                                localStorage.removeItem('suggestedRole');
                              }
                            } catch (e) {
                              const msg = e?.response?.data?.error || e?.response?.data?.message || e.message || 'Request failed';
                              setSuggestionResult({ error: msg });
                            } finally { setSuggestionLoading(false); }
                          }} disabled={suggestionLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow">{suggestionLoading ? 'Predicting...' : 'Career recommendation'}</button>

                          {suggestionResult && suggestionResult.role && (
                            <>
                              <div className="text-sm text-indigo-700 font-semibold">Suggested role: {suggestionResult.role}</div>
                              <button onClick={() => navigate(`/dashboard/jobs?role=${encodeURIComponent(suggestionResult.role)}`)} className="ml-3 bg-green-600 text-white px-3 py-1 rounded">Find the job</button>
                            </>
                          )}

                          {suggestionResult && suggestionResult.error && (
                            <div className="text-sm text-red-600">{suggestionResult.error}</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-red-700 font-bold mb-3">You are not eligible for job</div>
                        <div className="flex gap-3">
                          <button onClick={() => navigate('/learn')} className="bg-yellow-500 text-white px-4 py-2 rounded-lg">Learn skill</button>
                          <button onClick={() => navigate('/upgrade')} className="bg-gray-800 text-white px-4 py-2 rounded-lg">Upgrade skill</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </Step>
        </div>
      </div>
    </div>
  );
};

export default SkillLensCoach;

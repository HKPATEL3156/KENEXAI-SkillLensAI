import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { getCompanyJobs, getCompanyCandidates, scoreApplication, createCompanyJob, updateApplication, scoreAllApplications } from "../services/api";

export default function CompanyDashboard() {
  const [currentPage, setCurrentPage] = useState("candidates");
  const [companyInfo, setCompanyInfo] = useState({ companyName: "", email: "" });
  const [candidates, setCandidates] = useState([]);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobs, setJobs] = useState([
    { id: 1, title: "Backend Developer", dept: "Engineering", minScore: 65, skills: ["Python", "Django", "SQL", "REST APIs"], applicants: 18, active: true, posted: "2026-03-10" },
    { id: 2, title: "QA Engineer", dept: "Engineering", minScore: 60, skills: ["Selenium", "JIRA", "Postman"], applicants: 9, active: true, posted: "2026-03-08" },
    { id: 3, title: "ML Engineer", dept: "Data & AI", minScore: 75, skills: ["Python", "TensorFlow", "NLP", "Pandas"], applicants: 31, active: true, posted: "2026-03-05" }
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showPostRole, setShowPostRole] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", dept: "", minScore: 60, skills: "" });

  const navigate = useNavigate();

  const fallbackCandidates = [
    { _id: "1", fullName: "Sana Patel", email: "", headline: "ML Engineer · Charusat University", primaryLocation: "Anand, GJ", openToWork: true, skills: ["Python", "TensorFlow", "NLP", "Pandas", "scikit-learn"], education: [{ level: "Bachelor", institution: "Charusat University", boardUniversity: "GTU", cgpa: 8.7 }, { level: "HSC", institution: "GSEB Board", cgpa: 9.1 }, { level: "SSC", institution: "GSEB Board", cgpa: 9.4 }], projects: [{ title: "Resume ML Model", description: "NLP classifier 92% accuracy.", techStack: ["Python", "BERT", "FastAPI"] }], preferredRole: "ML Engineer", employmentType: "Full Time", experienceLevel: 0, expectedSalary: 600000, mobileNumber: "+91 91234 56789", socialLinks: { github: "github.com/sanapatel", linkedin: "linkedin.com/in/sanapatel" }, _quizPct: 91, _role: "ML Engineer" },
    { _id: "2", fullName: "Riya Shah", email: "", headline: "Backend Developer · DAIICT", primaryLocation: "Gandhinagar, GJ", openToWork: true, skills: ["Python", "Django", "SQL", "REST APIs", "Git"], education: [{ level: "Bachelor", institution: "DAIICT", boardUniversity: "Autonomous", cgpa: 8.2 }, { level: "SSC", institution: "CBSE", cgpa: 9.1 }], projects: [{ title: "Student Portal", description: "REST API backend 500+ users.", techStack: ["Django", "PostgreSQL"] }], preferredRole: "Backend Developer", employmentType: "Full Time", experienceLevel: 0, expectedSalary: 550000, mobileNumber: "+91 98765 43210", socialLinks: { github: "github.com/riyashah" }, _quizPct: 88, _role: "Backend Developer" },
    { _id: "3", fullName: "Karan Joshi", email: "", headline: "DevOps Engineer · IIT Bombay", primaryLocation: "Mumbai, MH", openToWork: true, skills: ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD"], education: [{ level: "Bachelor", institution: "IIT Bombay", boardUniversity: "IIT", cgpa: 8.4 }], projects: [{ title: "K8s Pipeline", description: "End-to-end CI/CD on EKS.", techStack: ["Docker", "Helm", "GitHub Actions"] }], preferredRole: "DevOps Engineer", employmentType: "Full Time", experienceLevel: 1, expectedSalary: 700000, mobileNumber: "+91 99887 11223", socialLinks: { github: "github.com/karanjoshi" }, _quizPct: 82, _role: "QA Engineer" },
    { _id: "4", fullName: "Arjun Mehta", email: "", headline: "Data Analyst · GTU", primaryLocation: "Ahmedabad, GJ", openToWork: false, skills: ["SQL", "Tableau", "Excel", "Power BI", "Python"], education: [{ level: "Bachelor", institution: "GTU", boardUniversity: "GTU", cgpa: 7.8 }, { level: "HSC", institution: "GSEB", cgpa: 8.2 }], projects: [{ title: "Sales Dashboard", description: "Tableau YOY comparison dashboard.", techStack: ["Tableau", "SQL"] }], preferredRole: "Data Analyst", employmentType: "Full Time", experienceLevel: 0, expectedSalary: 450000, mobileNumber: "+91 99887 65432", socialLinks: { linkedin: "linkedin.com/in/arjunmehta" }, _quizPct: 72, _role: "Data Analyst" },
    { _id: "5", fullName: "Priya Sharma", email: "", headline: "ML Engineer · BITS Pilani", primaryLocation: "Pilani, RJ", openToWork: true, skills: ["Python", "scikit-learn", "Pandas", "R", "Matplotlib"], education: [{ level: "Bachelor", institution: "BITS Pilani", boardUniversity: "BITS", cgpa: 9.1 }], projects: [{ title: "Churn Prediction", description: "XGBoost model 94% AUC.", techStack: ["XGBoost", "Pandas", "Flask"] }], preferredRole: "Data Scientist", employmentType: "Full Time", experienceLevel: 0, expectedSalary: 650000, mobileNumber: "+91 98112 34567", socialLinks: { github: "github.com/priyasharma" }, _quizPct: 79, _role: "ML Engineer" },
    { _id: "6", fullName: "Devraj Nair", email: "", headline: "Backend Developer · VIT", primaryLocation: "Vellore, TN", openToWork: false, skills: ["Node.js", "MongoDB", "Express", "JavaScript"], education: [{ level: "Bachelor", institution: "VIT Vellore", boardUniversity: "VIT", cgpa: 6.9 }, { level: "SSC", institution: "CBSE", cgpa: 7.6 }], projects: [{ title: "Blog Platform", description: "MERN stack blog with auth.", techStack: ["React", "Node.js", "MongoDB"] }], preferredRole: "Backend Developer", employmentType: "Full Time", experienceLevel: 0, expectedSalary: 400000, mobileNumber: "+91 88776 55443", socialLinks: { github: "github.com/devrajnair" }, _quizPct: 54, _role: "Backend Developer" }
  ];

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCompanyInfo({ companyName: payload.companyName || "Company", email: payload.email || "" });
      } catch (e) {
        console.error("Token decode error:", e);
      }
      // load company jobs and applicants (prefer job-specific applicants)
      getCompanyJobs()
        .then((res) => {
          const jobsData = (res.data && res.data.jobs) || [];
          if (jobsData.length > 0) {
            setJobs(jobsData.map(j => ({ id: j._id || j.id, title: j.title, dept: j.dept || '', minScore: j.minScore || 0, skills: j.skills || [], applicants: j.applicants || 0, active: j.status === 'active', posted: j.createdAt ? j.createdAt.split('T')[0] : '' })));
            const firstJobId = jobsData[0]._id || jobsData[0].id;
            api.get(`/company/dashboard/jobs/${firstJobId}/applicants`, { headers: { Authorization: `Bearer ${token}` } })
              .then(r => {
                if (r.data && r.data.candidates) setCandidates(r.data.candidates);
                else setCandidates(fallbackCandidates);
              })
              .catch(() => setCandidates(fallbackCandidates));
          } else {
            getCompanyCandidates()
              .then(r => setCandidates((r.data && r.data.candidates) || fallbackCandidates))
              .catch(() => setCandidates(fallbackCandidates));
          }
        })
        .catch(() => setCandidates(fallbackCandidates));
    } else {
      setCandidates(fallbackCandidates);
    }
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("companyToken");
    navigate("/login");
  };

  const getScoreColor = (pct) => {
    if (pct >= 80) return "text-green-600";
    if (pct >= 60) return "text-amber-600";
    return "text-red-600";
  };
  const getScoreBg = (pct) => {
    if (pct >= 80) return "bg-green-600";
    if (pct >= 60) return "bg-amber-600";
    return "bg-red-600";
  };

  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(c => (roleFilter === "All" || c._role === roleFilter) && c.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => sortOrder === "desc" ? b._quizPct - a._quizPct : a._quizPct - b._quizPct);
  }, [candidates, searchQuery, roleFilter, sortOrder]);

  const handlePostRole = (e) => {
    e.preventDefault();
    // Build FormData for multipart upload (supports jdFile PDF)
    const form = new FormData();
    form.append("title", newJob.title);
    form.append("minScore", String(newJob.minScore || 0));
    form.append("minExperienceYears", String(newJob.minExperienceYears || 0));
    form.append("employmentType", newJob.employmentType || "full-time");
    form.append("location", newJob.location || "");
    if (newJob.skills) form.append("skills", newJob.skills);
    if (newJob.jdFile) form.append("jdFile", newJob.jdFile);

    showToast("Posting role...");
    createCompanyJob(form)
      .then((res) => {
        const created = res.data && res.data.job ? res.data.job : null;
        if (created) {
          // refresh jobs list
          getCompanyJobs().then(r => {
            const jobsData = (r.data && r.data.jobs) || [];
            setJobs(jobsData.map(j => ({ id: j._id || j.id, title: j.title, dept: j.dept || '', minScore: j.minScore || 0, skills: j.skills || [], applicants: j.applicants || 0, active: j.status === 'active', posted: j.createdAt ? j.createdAt.split('T')[0] : '' })));
          }).catch(() => {});
          setShowPostRole(false);
          setNewJob({ title: "", dept: "", minScore: 60, skills: "", minExperienceYears: 0, employmentType: "full-time", location: "", jdFile: null });
          showToast("Role Posted ✓");
        } else {
          showToast("Failed to post role");
        }
      })
      .catch((err) => {
        console.error(err);
        showToast(err?.response?.data?.message || "Failed to post role");
      });
  };

  const fetchJobApplicants = (jobId) => {
    const token = localStorage.getItem("companyToken");
    if (!token) return;
    showToast("Loading applicants...");
    api.get(`/company/dashboard/jobs/${jobId}/applicants`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.data && r.data.candidates) setCandidates(r.data.candidates);
        else setCandidates(fallbackCandidates);
        setCurrentJobId(jobId);
        setCurrentPage('candidates');
      })
      .catch(() => setCandidates(fallbackCandidates));
  };

  const handleShortlist = () => {
    showToast("Shortlisted ✓");
  };

  const handleScoreOne = async (applicationId) => {
    try {
      showToast('Scoring...');
      const resp = await scoreApplication(applicationId);
      if (resp && resp.data) {
        const { resumeScore } = resp.data;
        setCandidates(prev => prev.map(c => (c.applicationId === applicationId ? { ...c, resumeScore } : c)));
        // if selectedCandidate matches, update it too
        setSelectedCandidate(prev => (prev && prev.applicationId === applicationId ? { ...prev, resumeScore } : prev));
        showToast('Scored ✓');
      }
    } catch (e) {
      showToast('Scoring failed');
    }
  };

  const handleScoreAll = async () => {
    if (!currentJobId) return showToast('Select a job first');
    try {
      showToast('Batch scoring started...');
      const resp = await scoreAllApplications(currentJobId);
      if (resp && resp.data) {
        // refetch applicants to get updated resumeScore
        fetchJobApplicants(currentJobId);
        showToast(`Batch scoring completed: ${resp.data.scored}/${resp.data.processed}`);
      } else {
        showToast('Batch scoring failed');
      }
    } catch (e) {
      showToast(e?.response?.data?.message || 'Batch scoring failed');
    }
  };

  const renderAnalytics = () => {
    const buckets = [
      { label: "90-100", count: candidates.filter(c => c._quizPct >= 90).length, color: "bg-green-600" },
      { label: "75-89", count: candidates.filter(c => c._quizPct >= 75 && c._quizPct < 90).length, color: "bg-blue-600" },
      { label: "60-74", count: candidates.filter(c => c._quizPct >= 60 && c._quizPct < 75).length, color: "bg-amber-600" },
      { label: "<60", count: candidates.filter(c => c._quizPct < 60).length, color: "bg-red-600" }
    ];
    
    const skillCounts = {};
    candidates.forEach(c => c.skills?.forEach(s => skillCounts[s] = (skillCounts[s] || 0) + 1));
    const topSkills = Object.entries(skillCounts).sort((a,b) => b[1] - a[1]).slice(0, 6);

    const roleColors = ["bg-blue-500", "bg-green-500", "bg-indigo-500", "bg-amber-500", "bg-red-500"];
    const rolesCount = {};
    candidates.forEach(c => rolesCount[c._role] = (rolesCount[c._role] || 0) + 1);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-3">Score Distribution</h3>
            {buckets.map((b, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between mb-1 text-sm">
                  <span className="text-gray-600">{b.label}</span>
                  <span className={`font-bold ${b.color.replace('bg-', 'text-')}`}>{b.count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100">
                  <div className={`h-2 rounded-full ${b.color}`} style={{ width: `${(b.count/candidates.length)*100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-semibold mb-3">Top Skills in Pool</h3>
            {topSkills.map(([skill, count], i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">{skill}</span>
                  <span className="text-xs text-blue-600 font-semibold">{count}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(count/candidates.length)*100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Applicants Per Role</h3>
          <div className="flex gap-4 items-end h-36 border-b pb-2">
            {Object.entries(rolesCount).map(([role, count], i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className={`text-xs font-bold ${roleColors[i%roleColors.length].replace('bg-', 'text-')}`}>{count}</span>
                <div className={`w-8 rounded-t-lg ${roleColors[i%roleColors.length]}`} style={{ height: `${(count/candidates.length)*100}%` }}></div>
                <span className="text-xs text-gray-400 text-center truncate w-full">{role.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans text-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col pt-6">
        <h1 className="text-2xl font-bold px-6 mb-8 text-blue-700">Kenexai</h1>
        <div className="px-6 mb-6">
          <p className="font-semibold">{companyInfo.companyName}</p>
          <p className="text-xs text-gray-500">{companyInfo.email}</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {['analytics', 'candidates', 'jobs'].map(page => (
            <button key={page} onClick={() => setCurrentPage(page)}
              className={`w-full text-left px-4 py-2 rounded-lg capitalize ${currentPage === page ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              {page}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="m-4 text-red-600 hover:bg-red-50 py-2 rounded-lg font-medium">Logout</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold capitalize">{currentPage}</h2>
          {currentPage === 'jobs' && (
            <button onClick={() => setShowPostRole(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-blue-700">+ Post Role</button>
          )}
        </div>

        {currentPage === 'analytics' && renderAnalytics()}

        {currentPage === 'jobs' && (
          <div className="grid grid-cols-2 gap-4">
            {jobs.map(job => (
              <div key={job.id} onClick={() => fetchJobApplicants(job.id)} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{job.title}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{job.dept}</span>
                </div>
                <p className="text-sm text-gray-500 mb-4 flex gap-4">
                  <span>Applicants: {job.applicants}</span>
                  <span>Min Score: {job.minScore}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {job.skills.map((s, i) => <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {currentPage === 'candidates' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-6 mb-4">
              <div className="flex-1">
                <div className="flex gap-4 mb-4">
                  <input type="text" placeholder="Search candidates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border p-2 rounded-lg flex-1 outline-none focus:ring-2 focus:ring-blue-100 text-sm" />
                  <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border p-2 rounded-lg outline-none text-sm">
                    <option value="All">All Roles</option>
                    {[...new Set(candidates.map(c => c._role))].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="border p-2 rounded-lg outline-none text-sm">
                    <option value="desc">Score: High to Low</option>
                    <option value="asc">Score: Low to High</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 bg-white rounded-lg border p-3 h-[520px] overflow-y-auto">
                    <h4 className="font-semibold mb-3">Applicants</h4>
                    <div className="divide-y">
                      {filteredCandidates.map((c, i) => (
                        <div key={c._id} onClick={() => { setSelectedCandidate(c); }} className={`py-3 px-2 cursor-pointer ${selectedCandidate && selectedCandidate.applicationId === c.applicationId ? 'bg-blue-50 rounded-md' : 'hover:bg-gray-50'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">{c.fullName}</p>
                              <p className="text-xs text-gray-500">{c.primaryLocation}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold">{(c.resumeScore||0)}%</div>
                              <div className="text-xs text-gray-400">{c.applicationStatus || 'applied'}</div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-600">
                            {c.skills?.slice(0,4).map(s => <span key={s} className="text-xs bg-gray-100 px-2 py-0.5 rounded-md mr-1">{s}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 bg-white rounded-lg border p-4 h-[520px] overflow-y-auto">
                    {selectedCandidate ? (
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{selectedCandidate.fullName}</h3>
                            <p className="text-sm text-gray-600">{selectedCandidate.headline} · {selectedCandidate.primaryLocation}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Applied: {new Date(selectedCandidate.appliedAt).toLocaleDateString()}</div>
                            <div className="text-2xl font-bold mt-2">{(selectedCandidate.resumeScore||0)}%</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-semibold mb-2">Contact</h4>
                            <p className="text-sm">Email: {selectedCandidate.email}</p>
                            <p className="text-sm">Phone: {selectedCandidate.mobileNumber || '-'}</p>
                            <p className="text-sm">Joined: {selectedCandidate.registrationDate ? new Date(selectedCandidate.registrationDate).toLocaleDateString() : ''}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Social</h4>
                            <p className="text-sm">LinkedIn: {selectedCandidate.socialLinks?.linkedin || '-'}</p>
                            <p className="text-sm">GitHub: {selectedCandidate.socialLinks?.github || '-'}</p>
                            <p className="text-sm">Portfolio: {selectedCandidate.socialLinks?.portfolio || '-'}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Education</h4>
                          {selectedCandidate.education?.length ? selectedCandidate.education.map((e, idx) => (
                            <div key={idx} className="mb-2 text-sm">
                              <div className="font-medium">{e.level} • {e.institution}</div>
                              <div className="text-gray-500">CGPA: {e.cgpa || '-'} • {e.startYear || ''} - {e.endYear || ''}</div>
                            </div>
                          )) : <div className="text-sm text-gray-500">No education data</div>}
                        </div>

                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Experience</h4>
                          {selectedCandidate.experience?.length ? selectedCandidate.experience.map((exp, idx) => (
                            <div key={idx} className="mb-2 text-sm">
                              <div className="font-medium">{exp.role} @ {exp.company}</div>
                              <div className="text-gray-500">{exp.startDate ? (new Date(exp.startDate).getFullYear()) : ''} - {exp.currentlyWorking ? 'Present' : (exp.endDate ? new Date(exp.endDate).getFullYear() : '')}</div>
                              <div className="text-gray-500 text-sm">{exp.description}</div>
                            </div>
                          )) : <div className="text-sm text-gray-500">No experience listed</div>}
                        </div>

                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">Projects</h4>
                          {selectedCandidate.projects?.length ? selectedCandidate.projects.map((p, idx) => (
                            <div key={idx} className="mb-2 text-sm border p-3 rounded-md">
                              <div className="font-medium">{p.title}</div>
                              <div className="text-gray-500">{p.description}</div>
                              <div className="text-xs text-gray-400">Stack: {p.techStack?.join(', ')}</div>
                            </div>
                          )) : <div className="text-sm text-gray-500">No projects</div>}
                        </div>

                        <div className="flex gap-3 mt-4">
                          <button onClick={() => { if (selectedCandidate.resumePath) window.open(selectedCandidate.resumePath, '_blank'); else showToast('No resume'); }} className="bg-blue-600 text-white px-4 py-2 rounded-md">View Resume</button>
                          <button onClick={async () => { try { await handleScoreOne(selectedCandidate.applicationId); } catch(e){}}} className="bg-green-600 text-white px-4 py-2 rounded-md">Score Resume</button>
                          <button onClick={async () => { try { await updateApplication(selectedCandidate.applicationId, { status: 'selected' }); setSelectedCandidate(prev => ({ ...prev, applicationStatus: 'selected' })); showToast('Marked selected'); } catch (e) { showToast('Update failed'); } }} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Mark Selected</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 mt-20">Select an applicant to view details</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedCandidate && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedCandidate(null)}></div>
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white z-50 shadow-2xl flex flex-col overflow-y-auto">
            <div className="p-7 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{selectedCandidate.fullName}</h2>
                  <p className="text-gray-600 text-sm">{selectedCandidate.headline}</p>
                </div>
                <button onClick={() => setSelectedCandidate(null)} className="text-gray-400 hover:text-gray-800 text-xl font-bold">&times;</button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center font-bold text-white shadow-inner" style={{backgroundColor: getScoreBg(selectedCandidate._quizPct).replace('bg-','')}}> 
                  {/* use simple tailwind class since logic function returns class  */}
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${getScoreBg(selectedCandidate._quizPct)}`}>
                     {selectedCandidate._quizPct}%
                  </div>
                </div>
                <div>
                   <p className="text-sm text-gray-500 font-medium">Platform Score</p>
                   <p className="text-lg font-semibold">{selectedCandidate._role}</p>
                   {selectedCandidate?.resumeScore !== undefined && (
                     <p className="text-sm text-gray-600 mt-1">Resume Score: <span className={`font-semibold ${getScoreColor(selectedCandidate.resumeScore || 0)}`}>{selectedCandidate.resumeScore}%</span></p>
                   )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Skills</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedCandidate.skills?.map(s => <span key={s} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{s}</span>)}
                  </div>
                </div>
                
                {selectedCandidate.education && (
                  <div>
                    <h4 className="font-semibold mb-2">Education</h4>
                    {selectedCandidate.education.map((e,i) => (
                      <div key={i} className="mb-2 text-sm">
                        <p className="font-medium">{e.level} • {e.institution}</p>
                        <p className="text-gray-500">CGPA: {e.cgpa}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedCandidate.projects && (
                  <div>
                    <h4 className="font-semibold mb-2">Projects</h4>
                    {selectedCandidate.projects.map((p,i) => (
                      <div key={i} className="mb-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="font-bold">{p.title}</p>
                        <p className="text-gray-600 my-1">{p.description}</p>
                        <p className="text-gray-400 text-xs">Stack: {p.techStack?.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-7 pb-7 flex gap-3 border-t pt-5 bg-white">
              <button onClick={handleShortlist} className="bg-blue-600 text-white flex-1 py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition">
                Shortlist
              </button>
              {selectedCandidate?.applicationId && (
                <button onClick={async () => {
                  try {
                    await updateApplication(selectedCandidate.applicationId, { status: 'selected' });
                    setSelectedCandidate(prev => ({ ...prev, applicationStatus: 'selected' }));
                    showToast('Marked selected');
                  } catch (e) {
                    showToast('Update failed');
                  }
                }} className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition">Mark Selected</button>
              )}
              <button onClick={() => {
                  const rp = selectedCandidate?.resumePath || selectedCandidate?.resumePath;
                  if (rp) window.open(rp, '_blank');
                  else showToast('No resume available');
                }} className="bg-blue-50 text-blue-700 border border-blue-200 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-100 transition">
                Download Resume
              </button>
              {selectedCandidate?.applicationId && (
                <button onClick={async () => {
                  try {
                    showToast('Scoring resume...');
                    const resp = await scoreApplication(selectedCandidate.applicationId);
                    if (resp && resp.data) {
                      const { resumeScore, matchedSkills } = resp.data;
                      setSelectedCandidate(prev => ({ ...prev, resumeScore, matchedSkills }));
                      showToast('Resume scored ✓');
                    } else {
                      showToast('Scoring failed');
                    }
                  } catch (e) {
                    const msg = e?.response?.data?.message || e?.message || 'Scoring failed';
                    showToast(msg);
                  }
                }} className="bg-green-600 text-white px-4 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition">
                  Score Resume
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Post Role Modal */}
      {showPostRole && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-[400px] shadow-xl">
            <h3 className="text-lg font-bold mb-4">Post New Role</h3>
            <form onSubmit={handlePostRole} className="space-y-4">
              <input required type="text" placeholder="Title (e.g. Frontend Dev)" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              <input required type="text" placeholder="Department" value={newJob.dept} onChange={e => setNewJob({...newJob, dept: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input required type="number" placeholder="Min Score (%)" value={newJob.minScore} onChange={e => setNewJob({...newJob, minScore: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
                <input type="number" placeholder="Min Experience (yrs)" value={newJob.minExperienceYears || 0} onChange={e => setNewJob({...newJob, minExperienceYears: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={newJob.employmentType || 'full-time'} onChange={e => setNewJob({...newJob, employmentType: e.target.value})} className="w-full border p-2 rounded-lg text-sm">
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="internship">Internship</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
                <input type="text" placeholder="Location (city, state)" value={newJob.location || ''} onChange={e => setNewJob({...newJob, location: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              </div>
              <input required type="text" placeholder="Skills (comma separated)" value={newJob.skills} onChange={e => setNewJob({...newJob, skills: e.target.value})} className="w-full border p-2 rounded-lg text-sm" />
              <div>
                <label className="block text-sm text-gray-600 mb-1">JD PDF</label>
                <input type="file" accept="application/pdf" onChange={e => setNewJob({...newJob, jdFile: e.target.files[0]})} className="w-full" />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowPostRole(false)} className="flex-1 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Post Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`fixed bottom-6 right-6 z-50 bg-blue-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg transition-opacity duration-300 ${toastMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {toastMessage}
      </div>
    </div>
  );
}

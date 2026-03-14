import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCandidateProfileById } from "../services/api";

/* ─── tiny helper components ─── */

const Section = ({ title, icon, children }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-3">
      <span className="text-lg">{icon}</span>
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>
    </div>
    <div className="px-6 py-4">{children}</div>
  </div>
);

const Empty = ({ msg = "Not specified" }) => (
  <p className="text-sm text-slate-400 italic">{msg}</p>
);

const SkillTag = ({ skill }) => (
  <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
    {skill}
  </span>
);

const StatusBadge = ({ status }) => {
  const colors = {
    applied: "bg-blue-50 text-blue-700 border-blue-200",
    shortlisted: "bg-amber-50 text-amber-700 border-amber-200",
    selected: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${colors[status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
};

/* ─── score ring ─── */
const ScoreRing = ({ score }) => {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const color = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold text-slate-800">{pct}%</span>
    </div>
  );
};

/* ─── main page ─── */
const CandidateProfileView = () => {
  const { candidateId } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) { nav("/company/login"); return; }

    getCandidateProfileById(candidateId)
      .then((res) => setProfile(res.data.candidate))
      .catch((err) => {
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          nav("/company/login");
        } else {
          setError(err?.response?.data?.message || "Failed to load candidate profile.");
        }
      })
      .finally(() => setLoading(false));
  }, [candidateId, nav]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-8 py-10 text-center max-w-sm">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm font-medium text-rose-700">{error}</p>
          <button onClick={() => nav(-1)} className="mt-5 rounded-xl bg-slate-800 px-5 py-2 text-sm text-white hover:bg-slate-700 transition-colors">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const {
    name, email, phone, location, headline, bio, openToWork,
    profileImage, accountType, currentStatus,
    skills = [], experience = [], education = [],
    projects = [], certifications = [], activities = [],
    socialLinks = {},
    experience_years, quiz_score, quiz_details,
    job_match_score, coverLetter, applicationStatus, appliedJob,
    resume_text, resume_file_url, registrationDate,
  } = profile;

  const initials = (name || email || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur px-6 py-3 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => nav(-1)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-semibold text-slate-800">Candidate Profile</span>
        {applicationStatus && <StatusBadge status={applicationStatus} />}
        {appliedJob?.title && (
          <span className="text-xs text-slate-400">
            Applied for: <span className="text-slate-600 font-medium">{appliedJob.title}</span>
          </span>
        )}
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">

        {/* ── HEADER CARD ── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {/* accent bar */}
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            {/* avatar */}
            {profileImage ? (
              <img
                src={`http://localhost:5000${profileImage}`}
                alt={name}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-indigo-100 shrink-0"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
                {initials}
              </div>
            )}
            {/* info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900">{name || "—"}</h1>
                {openToWork && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Open to Work
                  </span>
                )}
                {accountType && (
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-600">
                    {accountType}
                  </span>
                )}
              </div>
              {headline && <p className="text-sm text-slate-600 mb-1">{headline}</p>}
              {bio && <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{bio}</p>}
              {/* contact row */}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                {email && <span className="flex items-center gap-1">✉️ {email}</span>}
                {phone && <span className="flex items-center gap-1">📞 {phone}</span>}
                {location && <span className="flex items-center gap-1">📍 {location}</span>}
                {currentStatus && <span className="flex items-center gap-1">💼 {currentStatus}</span>}
              </div>
              {/* social links */}
              <div className="mt-2 flex flex-wrap gap-3">
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline font-medium">LinkedIn ↗</a>
                )}
                {socialLinks.github && (
                  <a href={socialLinks.github} target="_blank" rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline font-medium">GitHub ↗</a>
                )}
                {socialLinks.portfolio && (
                  <a href={socialLinks.portfolio} target="_blank" rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline font-medium">Portfolio ↗</a>
                )}
              </div>
            </div>

            {/* score column */}
            {(quiz_score != null || job_match_score != null) && (
              <div className="flex flex-col items-center gap-3 shrink-0">
                {quiz_score != null && (
                  <div className="flex flex-col items-center gap-1">
                    <ScoreRing score={quiz_score} />
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Quiz Score</span>
                  </div>
                )}
                {job_match_score != null && (
                  <div className="flex flex-col items-center gap-1">
                    <ScoreRing score={job_match_score} />
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Resume Match</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── SKILLS ── */}
        <Section title="Skills" icon="🛠️">
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => <SkillTag key={i} skill={s} />)}
            </div>
          ) : <Empty msg="No skills listed" />}
        </Section>

        {/* ── EXPERIENCE ── */}
        <Section title="Experience" icon="💼">
          {experience_years != null && (
            <p className="text-xs text-slate-500 mb-3">
              Total experience: <span className="font-semibold text-slate-700">{experience_years} yr{experience_years !== 1 ? "s" : ""}</span>
            </p>
          )}
          {experience.length > 0 ? (
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="relative pl-4 border-l-2 border-indigo-100">
                  <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-indigo-500" />
                  <p className="text-sm font-semibold text-slate-800">{exp.role || "—"}</p>
                  <p className="text-xs text-slate-500">{exp.company || "—"}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {exp.startDate ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                    {" – "}
                    {exp.currentlyWorking ? "Present" : exp.endDate ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                  </p>
                  {exp.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{exp.description}</p>}
                  {exp.technologies?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {exp.technologies.map((t, j) => (
                        <span key={j} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : experience_years == null ? (
            <Empty msg="Not specified" />
          ) : (
            <Empty msg="No experience records added" />
          )}
        </Section>

        {/* ── EDUCATION ── */}
        <Section title="Education" icon="🎓">
          {education.length > 0 ? (
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{edu.level || "—"}</p>
                      <p className="text-xs text-slate-600">{edu.institution || "—"}</p>
                      {edu.boardUniversity && <p className="text-[11px] text-slate-400">{edu.boardUniversity}</p>}
                    </div>
                    <div className="text-right">
                      {edu.cgpa != null && (
                        <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          CGPA: {edu.cgpa}
                        </span>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {edu.startYear || ""}{edu.startYear && edu.endYear ? " – " : ""}{edu.completed ? edu.endYear : edu.endYear ? `${edu.endYear} (ongoing)` : ""}
                      </p>
                    </div>
                  </div>
                  {edu.semesterWise?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-slate-500 mb-1.5 font-medium">Semester-wise SGPA</p>
                      <div className="flex flex-wrap gap-2">
                        {edu.semesterWise.map((s) => (
                          <div key={s.semNumber} className="flex flex-col items-center rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-center min-w-[40px]">
                            <span className="text-[10px] text-slate-400">Sem {s.semNumber}</span>
                            <span className="text-xs font-bold text-indigo-700">{s.sgpa}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : <Empty msg="No education records added" />}
        </Section>

        {/* ── PROJECTS ── */}
        <Section title="Projects" icon="🚀">
          {projects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-1">{p.title || "Untitled"}</p>
                  {p.description && <p className="text-xs text-slate-600 leading-relaxed mb-2">{p.description}</p>}
                  {p.techStack?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.techStack.map((t, j) => (
                        <span key={j} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600 font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    {p.githubLink && (
                      <a href={p.githubLink} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline font-medium">GitHub ↗</a>
                    )}
                    {p.liveDemoLink && (
                      <a href={p.liveDemoLink} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline font-medium">Live Demo ↗</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty msg="No projects listed" />}
        </Section>

        {/* ── CERTIFICATIONS / ACHIEVEMENTS ── */}
        <Section title="Certifications & Achievements" icon="🏆">
          {certifications.length > 0 ? (
            <div className="space-y-3">
              {certifications.map((c, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                  <span className="text-base mt-0.5">🥇</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.title || "—"}</p>
                    {c.organization && <p className="text-xs text-slate-500">{c.organization}{c.year ? ` · ${c.year}` : ""}</p>}
                    {c.description && <p className="text-xs text-slate-600 mt-1">{c.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty msg="No certifications or achievements listed" />}
        </Section>

        {/* ── QUIZ RESULTS ── */}
        <Section title="Assessment Results" icon="📊">
          {quiz_score != null ? (
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <ScoreRing score={quiz_score} />
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-slate-800">
                  Quiz Score: <span className="text-indigo-700">{quiz_score}%</span>
                </p>
                {quiz_details?.obtainedMarks != null && (
                  <p className="text-xs text-slate-500">
                    {quiz_details.obtainedMarks} / {quiz_details.totalMarks} marks
                  </p>
                )}
                {quiz_details?.attemptedAt && (
                  <p className="text-xs text-slate-400">
                    Attempted: {new Date(quiz_details.attemptedAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
                {job_match_score != null && (
                  <p className="text-xs text-slate-500">
                    Resume Match Score: <span className="font-semibold text-slate-700">{job_match_score}%</span>
                  </p>
                )}
              </div>
            </div>
          ) : <Empty msg="No quiz attempts on record" />}
        </Section>

        {/* ── COVER LETTER ── */}
        {coverLetter && (
          <Section title="Cover Letter" icon="✉️">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{coverLetter}</p>
          </Section>
        )}

        {/* ── RESUME ── */}
        <Section title="Resume" icon="📄">
          {resume_file_url ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xl">📎</div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Resume uploaded</p>
                  <p className="text-xs text-slate-400">PDF document</p>
                </div>
                <a
                  href={resume_file_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="ml-auto flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  ⬇ Download Resume
                </a>
              </div>
              {resume_text && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 max-h-48 overflow-y-auto">
                  <p className="text-[11px] text-slate-500 mb-1 font-medium uppercase tracking-wide">Parsed Text Preview</p>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{resume_text.slice(0, 1500)}{resume_text.length > 1500 ? "…" : ""}</pre>
                </div>
              )}
            </div>
          ) : (
            <Empty msg="No resume uploaded for this candidate" />
          )}
        </Section>

        {/* ── FOOTER ── */}
        {registrationDate && (
          <p className="text-center text-[11px] text-slate-400 pb-4">
            Member since {new Date(registrationDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        )}

      </div>
    </div>
  );
};

export default CandidateProfileView;

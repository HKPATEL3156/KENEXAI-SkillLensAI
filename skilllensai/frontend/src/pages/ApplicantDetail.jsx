import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CompanyShell from '../components/CompanyShell';
import { companyLogin, getCompanyProfile } from '../services/api';
import api, { getCompanyJobs, getCompanyCandidates } from '../services/api';
import { updateApplication, scoreApplication } from '../services/api';

const ApplicantDetail = () => {
  const { id } = useParams(); // applicationId
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [app, setApp] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('companyToken');
    if (!token) { nav('/company/login'); return; }
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/company/dashboard/applications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setApp(res.data.application);
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) nav('/company/login');
        else setErr(e?.response?.data?.message || e.message);
      } finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <CompanyShell active="candidates"><div className="p-6">Loading…</div></CompanyShell>;
  if (err) return <CompanyShell active="candidates"><div className="p-6 text-red-600">{err}</div></CompanyShell>;
  if (!app) return <CompanyShell active="candidates"><div className="p-6">No application found.</div></CompanyShell>;

  const { user, job } = app;

  return (
    <CompanyShell active="candidates">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{user.fullName}</h1>
            <p className="text-sm text-gray-600">{user.headline} • {user.primaryLocation}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Applied: {new Date(app.appliedAt).toLocaleString()}</div>
            <div className="text-2xl font-bold mt-2">{app.resumeScore}%</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <section className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">Contact</h3>
              <div className="text-sm text-gray-700">Email: {user.email}</div>
              <div className="text-sm text-gray-700">Phone: {user.mobileNumber || '-'}</div>
              <div className="text-sm text-gray-700">Bio: {user.bio || '-'}</div>
            </section>

            <section className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">Education</h3>
              {user.education?.length ? user.education.map((e, i) => (
                <div key={i} className="mb-2 text-sm">
                  <div className="font-medium">{e.level} • {e.institution}</div>
                  <div className="text-gray-500 text-xs">CGPA: {e.cgpa || '-'} · {e.startYear || ''} - {e.endYear || ''}</div>
                </div>
              )) : <div className="text-sm text-gray-500">No education data</div>}
            </section>

            <section className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">Experience</h3>
              {user.experience?.length ? user.experience.map((ex,i) => (
                <div key={i} className="mb-3">
                  <div className="font-medium">{ex.role} @ {ex.company}</div>
                  <div className="text-xs text-gray-500">{ex.startDate ? new Date(ex.startDate).getFullYear() : ''} - {ex.currentlyWorking ? 'Present' : (ex.endDate ? new Date(ex.endDate).getFullYear() : '')}</div>
                  <div className="text-sm text-gray-700">{ex.description}</div>
                </div>
              )) : <div className="text-sm text-gray-500">No experience listed</div>}
            </section>

            <section className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">Projects</h3>
              {user.projects?.length ? user.projects.map((p,i) => (
                <div key={i} className="mb-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-sm text-gray-700">{p.description}</div>
                </div>
              )) : <div className="text-sm text-gray-500">No projects</div>}
            </section>
          </div>

          <aside className="col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Resume & Application</h4>
              <div className="mb-2 text-sm">Resume Score: <strong>{app.resumeScore}%</strong></div>
              <div className="mb-2 text-sm">Status: <strong>{app.status}</strong></div>
              <div className="mb-2 text-sm">Consent: {app.consentConfirmed ? 'Yes' : 'No'}</div>
              <div className="mb-2 text-sm">Academic: {app.academic?.degree || '-' } • {app.academic?.cgpa || app.academic?.percentage || '-'}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { if (app.resumePath) window.open(app.resumePath, '_blank'); else alert('No resume'); }} className="bg-blue-600 text-white px-3 py-2 rounded">View Resume</button>
                <button onClick={async () => { try { await scoreApplication(app.applicationId); const res = await api.get(`/company/dashboard/applications/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('companyToken')}` } }); setApp(res.data.application); alert('Scored'); } catch(e) { alert('Scoring failed'); } }} className="bg-green-600 text-white px-3 py-2 rounded">Score Resume</button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Job</h4>
              <div className="text-sm font-medium">{job.title}</div>
              <div className="text-xs text-gray-500">Min score: {job.minScore}%</div>
              <div className="text-xs text-gray-500">Skills: {job.skills?.join(', ')}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Actions</h4>
              <div className="flex flex-col gap-2">
                <button onClick={async () => { try { await updateApplication(app.applicationId, { status: 'shortlisted' }); setApp(prev => ({ ...prev, status: 'shortlisted' })); alert('Shortlisted'); } catch(e){ alert('Update failed'); } }} className="bg-indigo-600 text-white px-3 py-2 rounded">Shortlist</button>
                <button onClick={async () => { try { await updateApplication(app.applicationId, { status: 'rejected' }); setApp(prev => ({ ...prev, status: 'rejected' })); alert('Rejected'); } catch(e){ alert('Update failed'); } }} className="bg-rose-600 text-white px-3 py-2 rounded">Reject</button>
                <button onClick={async () => { try { await updateApplication(app.applicationId, { status: 'selected' }); setApp(prev => ({ ...prev, status: 'selected' })); alert('Selected'); } catch(e){ alert('Update failed'); } }} className="bg-green-700 text-white px-3 py-2 rounded">Mark Selected</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </CompanyShell>
  );
};

export default ApplicantDetail;

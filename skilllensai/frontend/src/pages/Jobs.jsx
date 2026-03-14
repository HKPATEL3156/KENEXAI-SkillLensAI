import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import JobCard from '../components/JobCard';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('');
  const [jobLocation, setJobLocation] = useState('');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (q) params.q = q;
      if (skill) params.skill = skill;
      if (jobLocation) params.location = jobLocation;
      const res = await api.get('/jobs', { params });
      setJobs(res.data.jobs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get('role');
    if (role) {
      setQ(role);
      setSkill(role);
    }
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold">Job Finder</h2>
          <p className="text-sm text-slate-500 mt-1">Search roles by title, skill or location — tailored for you.</p>
        </div>
        <div className="text-sm text-slate-500">{jobs.length} results</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input placeholder="Search title or description" value={q} onChange={(e)=>setQ(e.target.value)} className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-100" />
          <input placeholder="Skill" value={skill} onChange={(e)=>setSkill(e.target.value)} className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-100" />
          <input placeholder="Location" value={jobLocation} onChange={(e)=>setJobLocation(e.target.value)} className="p-3 border rounded-lg focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={fetchJobs} className="px-5 py-2 bg-indigo-600 text-white rounded-lg shadow">Search</button>
          <button onClick={() => { setQ(''); setSkill(''); setJobLocation(''); fetchJobs(); }} className="px-4 py-2 border rounded-lg">Reset</button>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-slate-400">Loading jobs…</div> : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.length === 0 && <div className="p-6 text-gray-500">No jobs found.</div>}
          {jobs.map(j => <JobCard key={j._id || j.id} job={j} />)}
        </div>
      )}
    </div>
  );
};

export default Jobs;
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
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Job Finder</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input placeholder="Search title or description" value={q} onChange={(e)=>setQ(e.target.value)} className="p-2 border rounded" />
        <input placeholder="Skill" value={skill} onChange={(e)=>setSkill(e.target.value)} className="p-2 border rounded" />
        <input placeholder="Location" value={jobLocation} onChange={(e)=>setJobLocation(e.target.value)} className="p-2 border rounded" />
      </div>
      <div className="flex gap-2 mb-6">
        <button onClick={fetchJobs} className="px-4 py-2 bg-blue-600 text-white rounded">Search</button>
        <button onClick={() => { setQ(''); setSkill(''); setJobLocation(''); fetchJobs(); }} className="px-4 py-2 bg-gray-200 rounded">Reset</button>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.length === 0 && <div className="p-4 text-gray-500">No jobs found.</div>}
          {jobs.map(j => <JobCard key={j._id} job={j} />)}
        </div>
      )}
    </div>
  );
};

export default Jobs;
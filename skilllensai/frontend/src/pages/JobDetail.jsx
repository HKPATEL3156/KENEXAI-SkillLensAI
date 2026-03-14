import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

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
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!job) return <div className="p-6">Job not found</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <div className="text-sm text-gray-600">{job.companyName} • {job.location || 'Remote'}</div>
          </div>
          <div className="text-sm text-gray-500">Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}</div>
        </div>

        <div className="mt-4 text-gray-700" dangerouslySetInnerHTML={{ __html: job.description }} />

        <div className="mt-4">
          <div className="font-semibold mb-1">Skills</div>
          <div className="flex gap-2 flex-wrap">{(job.skills||[]).map((s,i)=>(<span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{s}</span>))}</div>
        </div>

        <div className="mt-4 flex gap-2">
          {job.applyUrl ? (<a className="px-4 py-2 bg-green-600 text-white rounded" href={job.applyUrl} target="_blank" rel="noreferrer">Apply</a>) : (<button className="px-4 py-2 bg-gray-200 rounded">Contact</button>)}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
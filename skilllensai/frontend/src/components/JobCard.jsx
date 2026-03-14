import React from 'react';
import { useNavigate } from 'react-router-dom';

const JobCard = ({ job }) => {
  const navigate = useNavigate();
  return (
    <div className="p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition group border border-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-xl font-semibold text-slate-900">{job.title}</div>
          <div className="text-sm text-slate-500 mt-1">{job.companyName} • {job.location || 'Remote'}</div>
          <div className="mt-3 text-sm text-slate-700 line-clamp-3">{job.description}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(job.skills||[]).slice(0,6).map((s,i)=> <span key={i} className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-700">{s}</span>)}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between">
          <div className="text-sm text-slate-400">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}</div>
          <button onClick={() => navigate(`/dashboard/jobs/${job._id || job.id}`)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700">View</button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
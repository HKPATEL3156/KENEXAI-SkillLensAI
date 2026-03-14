import React from 'react';
import { useNavigate } from 'react-router-dom';

const JobCard = ({ job }) => {
  const navigate = useNavigate();
  return (
    <div className="p-4 bg-white rounded shadow hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold text-gray-900">{job.title}</div>
          <div className="text-sm text-gray-600">{job.companyName} • {job.location || 'Remote'}</div>
        </div>
        <div className="text-sm text-gray-500">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : ''}</div>
      </div>
      <div className="mt-2 text-sm text-gray-700 line-clamp-3">{job.description}</div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(job.skills||[]).slice(0,5).map((s,i)=> <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{s}</span>)}
        </div>
        <div>
          <button onClick={() => navigate(`/dashboard/jobs/${job._id}`)} className="px-3 py-1 bg-blue-600 text-white rounded">View</button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
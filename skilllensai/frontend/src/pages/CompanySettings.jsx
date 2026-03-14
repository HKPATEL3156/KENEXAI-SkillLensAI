import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";

const CompanySettings = () => {
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) nav("/company/login");
  }, [nav]);

  return (
    <CompanyShell active="settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your company profile and account preferences.
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        <Link
          to="/company/profile"
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Company Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">Edit company name, contact, and address</p>
            </div>
          </div>
          <span className="text-indigo-600 group-hover:translate-x-0.5 inline-block transition-transform">→</span>
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm opacity-75">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Account & Security</h2>
              <p className="text-xs text-slate-500 mt-0.5">Password, notifications — coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </CompanyShell>
  );
};

export default CompanySettings;

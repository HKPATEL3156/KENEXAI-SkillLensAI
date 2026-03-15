import React from "react";
import { Link, useLocation } from "react-router-dom";
import Layout from "./Layout";

const NavItem = ({ to, label, active, badge }) => (
  <Link
    to={to}
    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
      active
        ? "bg-slate-100 font-semibold text-slate-900"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    }`}
  >
    <span>{label}</span>
    {typeof badge === "number" && badge > 0 && (
      <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
        {badge}
      </span>
    )}
  </Link>
);

const AdminShell = ({ active, children, pendingCount = 0 }) => {
  const location = useLocation();
  const current = active || location.pathname.split("/")[2] || "dashboard";

  const adminEmail = "admin.skilllensai@gmail.com";

  return (
    <Layout>
      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              SL
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                SkillLens Admin
              </div>
              <div className="text-xs text-slate-500">{adminEmail}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
              Verified
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              Admin
            </span>
          </div>
          <nav className="mt-6 space-y-1 text-sm">
            <NavItem
              to="/admin/dashboard"
              label="Overview"
              active={current === "dashboard"}
            />
            <NavItem
              to="/admin/users"
              label="Candidates"
              active={current === "users"}
            />
            <NavItem
              to="/admin/companies"
              label="Companies"
              active={current === "companies"}
            />
            <NavItem
              to="/admin/pending"
              label="Pending Approvals"
              active={current === "pending"}
              badge={pendingCount}
            />
            <NavItem
              to="/admin/analytics"
              label="Analytics"
              active={current === "analytics"}
            />
            <NavItem
              to="/admin/warehouse"
              label="🏛️ Data Warehouse"
              active={current === "warehouse"}
            />
          </nav>
          <div className="mt-auto border-t pt-4 text-xs text-slate-500">
            Use this panel to oversee student activity, company onboarding, and
            quiz performance.
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </Layout>
  );
};

export default AdminShell;


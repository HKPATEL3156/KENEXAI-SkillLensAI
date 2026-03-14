import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompanyShell from "../components/CompanyShell";
import { getCompanyProfile, updateCompanyProfile } from "../services/api";

const Field = ({ label, value }) => (
  <div>
    <div className="text-xs font-medium text-slate-500 mb-0.5">{label}</div>
    <div className="text-sm text-slate-900">{value || <span className="text-slate-400">—</span>}</div>
  </div>
);

const CompanyProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("companyToken");
    if (!token) { nav("/company/login"); return; }
    const load = async () => {
      setLoading(true);
      try {
        const res = await getCompanyProfile();
        const c = res.data.company;
        setProfile(c);
        setForm({
          companyName: c.companyName || "",
          contactName: c.contactName || "",
          contactPhone: c.contactPhone || "",
          street: c.address?.street || "",
          city: c.address?.city || "",
          state: c.address?.state || "",
          postalCode: c.address?.postalCode || "",
          country: c.address?.country || "",
        });
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          nav("/company/login");
        } else {
          setErr(e?.response?.data?.message || e.message);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [nav]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setSuccess("");
    try {
      const payload = {
        companyName: form.companyName,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
      };
      const res = await updateCompanyProfile(payload);
      const updated = res.data.company;
      setProfile(updated);
      // sync localStorage
      const info = JSON.parse(localStorage.getItem("companyInfo") || "{}");
      localStorage.setItem("companyInfo", JSON.stringify({ ...info, companyName: updated.companyName }));
      setSuccess("Profile updated successfully.");
      setEditing(false);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile?.companyName || "CO")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <CompanyShell active="profile">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage your company information.
          </p>
        </div>
        {!editing && !loading && (
          <button
            onClick={() => { setEditing(true); setSuccess(""); setErr(""); }}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center text-xs text-slate-400 py-12">Loading profile…</div>
      ) : editing ? (
        /* Edit form */
        <form onSubmit={handleSave} className="max-w-2xl space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Company Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Street</label>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">State / Province</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setErr(""); }}
              className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* View mode */
        <div className="max-w-2xl space-y-5">
          {/* Header card */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
                {initials}
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile?.companyName}</h2>
                <p className="text-indigo-200 text-sm">{profile?.email}</p>
                <div className="mt-2 inline-flex items-center rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">
                  ✓ Approved & Active
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Company Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name" value={profile?.companyName} />
              <Field label="Email" value={profile?.email} />
              <Field label="Contact Name" value={profile?.contactName} />
              <Field label="Contact Phone" value={profile?.contactPhone} />
              <Field label="Account Status" value={profile?.status?.charAt(0).toUpperCase() + profile?.status?.slice(1)} />
              <Field label="Recruitment Access" value={profile?.allowedToRecruit ? "Active" : "Inactive"} />
              <Field
                label="Member Since"
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : null}
              />
              <Field
                label="Last Updated"
                value={profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : null}
              />
            </div>
          </div>

          {/* Address */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Address</h3>
            {profile?.address && Object.values(profile.address).some(Boolean) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Street" value={profile.address.street} />
                <Field label="City" value={profile.address.city} />
                <Field label="State / Province" value={profile.address.state} />
                <Field label="Postal Code" value={profile.address.postalCode} />
                <Field label="Country" value={profile.address.country} />
              </div>
            ) : (
              <p className="text-xs text-slate-400">No address information provided.</p>
            )}
          </div>
        </div>
      )}
    </CompanyShell>
  );
};

export default CompanyProfilePage;

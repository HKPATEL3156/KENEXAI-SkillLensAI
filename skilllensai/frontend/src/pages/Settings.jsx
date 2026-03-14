

import React, { useEffect, useState } from "react";
import { getProfile, patchProfile, changePassword, deleteAccount } from "../services/api";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../assets/default-avatar.svg";

const backendBase = import.meta?.env?.VITE_API_BASE || "http://localhost:5000";
const resolveAsset = (p) => {
  if (!p) return "";
  if (p.startsWith("/uploads") || p.startsWith("uploads")) return backendBase + (p.startsWith("/") ? p : `/${p}`);
  return p;
};

const Settings = () => {
  const [profile, setProfile] = useState({ name: "", email: "", username: "", dob: "", profilePhoto: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState({ old: "", new: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const nav = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const res = await getProfile();
      const u = res.data?.user || res.data || {};
      const name = u.fullName || (u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : (u.name || u.username || ''));
      const dob = u.dob ? (u.dob.substring ? u.dob.substring(0,10) : u.dob) : "";
      const photo = resolveAsset(u.profilePhoto || u.profileImage || "");
      setProfile({ name, email: u.email || "", username: u.username || "", dob, profilePhoto: photo });
    } catch (e) {
      setError('Failed to load profile');
    } finally { setLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      // client-side validation
      if (!password.old || !password.new) return setError('Please enter both old and new passwords');
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password.new)) return setError('New password must be 8+ chars, include uppercase, number and special char');
      // backend expects keys: { old, new }
      const resp = await changePassword({ old: password.old, new: password.new });
      setSuccess(resp?.data?.message || 'Password changed'); setPassword({ old: '', new: '' });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to change password';
      setError(msg);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!newEmail || !newEmail.includes('@')) return setError('Enter a valid email');
    try {
      const res = await patchProfile({ email: newEmail });
      const u = res.data?.user || res.data || {};
      setProfile(prev => ({ ...prev, email: u.email || newEmail }));
      setSuccess('Email updated'); setNewEmail('');
    } catch (err) { setError('Failed to update email'); }
  };

  const handleDelete = async () => {
    setError(""); setSuccess("");
    if (!window.confirm('Are you sure you want to delete your account?')) return;
    try {
      await deleteAccount(); localStorage.removeItem('token'); nav('/login');
    } catch (err) { setError('Failed to delete account'); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); window.location.replace('/login'); };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-xl mt-10">
      <h1 className="text-3xl font-extrabold mb-6 text-gray-800">Settings</h1>
      {error && <div className="text-red-600 mb-2 font-semibold">{error}</div>}
      {success && <div className="text-green-600 mb-2 font-semibold">{success}</div>}

      <div className="bg-white p-6 rounded-xl shadow mb-6 flex items-center gap-6">
        <img src={profile.profilePhoto || defaultAvatar} alt="avatar" className="w-28 h-28 rounded-full object-cover" />
        <div>
          <div className="text-xl font-semibold">{profile.name || 'Your name'}</div>
          <div className="text-sm text-gray-600">{profile.email}</div>
          <div className="text-sm text-gray-600">{profile.username}</div>
          <div className="text-sm text-gray-600">{profile.dob}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <form onSubmit={handleEmailChange} className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Change Email</h2>
          <div className="flex gap-2">
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email" className="border p-2 rounded flex-1" />
            <button className="bg-indigo-600 text-white px-4 py-2 rounded" type="submit">Change</button>
          </div>
        </form>

        <form onSubmit={handlePasswordChange} className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Change Password</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="relative">
              <input type={showOld ? 'text' : 'password'} placeholder="Old password" value={password.old} onChange={e => setPassword({ ...password, old: e.target.value })} className="border p-2 rounded w-full" />
              <button type="button" onClick={() => setShowOld(s => !s)} className="absolute right-2 top-2 text-xs text-gray-600">{showOld ? 'Hide' : 'Show'}</button>
            </div>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} placeholder="New password" value={password.new} onChange={e => setPassword({ ...password, new: e.target.value })} className="border p-2 rounded w-full" />
              <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-2 top-2 text-xs text-gray-600">{showNew ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Password must be 8+ chars, include uppercase, number and a special character.</div>
          <div className="flex justify-end mt-3">
            <button className="bg-green-600 text-white px-4 py-2 rounded" type="submit">Change Password</button>
          </div>
        </form>

        <div className="bg-white p-4 rounded shadow flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-600">Delete Account</h3>
            <div className="text-sm text-gray-500">This is irreversible. Your data will be removed.</div>
          </div>
          <div className="flex gap-2">
            <button className="bg-gray-600 text-white px-4 py-2 rounded" onClick={handleLogout}>Logout</button>
            <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDelete}>Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
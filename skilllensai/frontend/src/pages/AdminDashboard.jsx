import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("adminToken");

  const fetchAll = async () => {
    setErr("");
    try {
      const usersRes = await api.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(usersRes.data.data || usersRes.data);
      const reqRes = await api.get("/admin/company-requests", { headers: { Authorization: `Bearer ${token}` } });
      setRequests(reqRes.data.data || reqRes.data);
    } catch (err) {
      setErr(err?.response?.data?.message || err.message);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const approve = async (id) => {
    try {
      await api.post(`/admin/company-requests/${id}/approve`, null, { headers: { Authorization: `Bearer ${token}` } });
      fetchAll();
    } catch (err) { setErr(err?.response?.data?.message || err.message); }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-8">
        <h2 className="text-3xl font-black mb-6">Admin Dashboard</h2>
        {err && <div className="text-red-500 mb-4">{err}</div>}

        <section className="mb-8">
          <h3 className="font-bold text-xl mb-3">Company Requests</h3>
          <div className="grid gap-4">
            {requests.map((r) => (
              <div key={r._id} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <div className="font-bold">{r.companyName} — <span className="text-sm text-slate-500">{r.status}</span></div>
                  <div className="text-sm text-slate-600">{r.email} • {r.contactPhone}</div>
                </div>
                <div className="flex gap-2">
                  {r.status !== "approved" && <button onClick={() => approve(r._id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-bold text-xl mb-3">User History / Data</h3>
          <div className="grid gap-2">
            {users.map((u) => (
              <div key={u._id} className="p-3 border rounded">
                <div className="font-bold">{u.fullName || u.email} <span className="text-sm text-slate-500">{u.username}</span></div>
                <div className="text-sm text-slate-600">{new Date(u.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default AdminDashboard;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Layout from "../components/Layout";

const AdminLogin = () => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/admin/login", form);
      const token = res.data.token;
      localStorage.setItem("adminToken", token);
      nav("/admin/dashboard");
    } catch (err) {
      setErr(err?.response?.data?.message || err.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto p-8">
        <h2 className="text-2xl font-black mb-4">Admin Login</h2>
        <form onSubmit={submit} className="space-y-4">
          <input name="username" placeholder="Username or email" value={form.username} onChange={onChange} className="w-full p-3 rounded border" />
          <input name="password" placeholder="Password" type="password" value={form.password} onChange={onChange} className="w-full p-3 rounded border" />
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Sign In</button>
        </form>
        {err && <div className="mt-4 text-red-500">{err}</div>}
        <div className="mt-4 text-sm text-slate-500">Use username <strong>Admin</strong> and password <strong>Admin@0258</strong></div>
      </div>
    </Layout>
  );
};

export default AdminLogin;

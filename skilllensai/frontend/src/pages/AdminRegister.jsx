import React, { useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

const AdminRegister = () => {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [msg, setMsg] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/admin/register", form);
      setMsg(res.data.message || "Created");
    } catch (err) {
      setMsg(err?.response?.data?.message || err.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto p-8">
        <h2 className="text-2xl font-black mb-4">Admin Register</h2>
        <form onSubmit={submit} className="space-y-4">
          <input name="username" placeholder="Username" value={form.username} onChange={onChange} className="w-full p-3 rounded border" />
          <input name="email" placeholder="Email" value={form.email} onChange={onChange} className="w-full p-3 rounded border" />
          <input name="password" placeholder="Password" type="password" value={form.password} onChange={onChange} className="w-full p-3 rounded border" />
          <button className="px-4 py-2 bg-green-600 text-white rounded">Register</button>
        </form>
        {msg && <div className="mt-4 text-sm">{msg}</div>}
      </div>
    </Layout>
  );
};

export default AdminRegister;

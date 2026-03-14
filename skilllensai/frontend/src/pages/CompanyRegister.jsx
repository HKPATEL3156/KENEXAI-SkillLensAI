import React, { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

const CompanyRegister = () => {
  const [form, setForm] = useState({ companyName: "", contactName: "", contactPhone: "", email: "", password: "", street: "", city: "", state: "", postalCode: "", country: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("companyName", form.companyName);
      formData.append("contactName", form.contactName);
      formData.append("contactPhone", form.contactPhone);
      formData.append("email", form.email);
      formData.append("password", form.password);
      const address = { street: form.street, city: form.city, state: form.state, postalCode: form.postalCode };
      formData.append("address", JSON.stringify(address));
      formData.append("country", form.country);
      if (file) formData.append("document", file);

      const res = await api.post("/company/register", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage(res.data.message || "Request submitted");
      setForm({ companyName: "", contactName: "", contactPhone: "", email: "", password: "", street: "", city: "", state: "", postalCode: "", country: "" });
      setFile(null);
    } catch (err) {
      setMessage(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-8">
        <h2 className="text-3xl font-black mb-6">Company Recruitment Registration</h2>
        <p className="mb-6 text-slate-600">Provide company details to request permission to recruit users.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold">Company Name</label>
            <input required name="companyName" value={form.companyName} onChange={handleChange} className="w-full p-3 rounded border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold">Contact Name</label>
              <input name="contactName" value={form.contactName} onChange={handleChange} className="w-full p-3 rounded border" />
            </div>
            <div>
              <label className="block font-bold">Contact Phone</label>
              <input name="contactPhone" value={form.contactPhone} onChange={handleChange} className="w-full p-3 rounded border" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold">Email</label>
              <input required name="email" value={form.email} onChange={handleChange} type="email" className="w-full p-3 rounded border" />
            </div>
            <div>
              <label className="block font-bold">Password</label>
              <input required name="password" value={form.password} onChange={handleChange} type="password" className="w-full p-3 rounded border" />
            </div>
          </div>

          <div>
            <label className="block font-bold">Address (Street)</label>
            <input name="street" value={form.street} onChange={handleChange} className="w-full p-3 rounded border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="p-3 rounded border" />
            <input name="state" value={form.state} onChange={handleChange} placeholder="State" className="p-3 rounded border" />
            <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="Postal Code" className="p-3 rounded border" />
          </div>
          <div>
            <label className="block font-bold">Country</label>
            <input name="country" value={form.country} onChange={handleChange} className="w-full p-3 rounded border" />
          </div>

          <div>
            <label className="block font-bold">Company Document (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mt-2" />
          </div>

          <div>
            <button disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded">{loading ? "Submitting..." : "Submit Request"}</button>
          </div>
          {message && <div className="mt-4 text-sm text-slate-700">{message}</div>}
          <div className="mt-2 text-sm text-slate-500">
            Already registered and approved?{" "}
            <Link to="/company/login" className="text-blue-600 font-medium hover:underline">Sign in here</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CompanyRegister;

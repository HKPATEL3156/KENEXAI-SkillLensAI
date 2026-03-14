import Layout from "../components/Layout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const Login = ({ defaultRole = "user" }) => {
  const nav = useNavigate();
  const [data, setData] = useState({ identifier: "", password: "" });
  const [role, setRole] = useState(defaultRole);
  const [error, setError] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let res;

      if (role === "user") {
        res = await api.post("/auth/login", {
          email: data.identifier,
          password: data.password,
        });
        localStorage.setItem("token", res.data.token);
        nav("/dashboard");
      } else if (role === "admin") {
        res = await api.post("/admin/login", {
          username: data.identifier,
          password: data.password,
        });
        localStorage.setItem("adminToken", res.data.token);
        nav("/admin/dashboard");
      } else if (role === "company") {
        res = await api.post("/company/login", {
          email: data.identifier,
          password: data.password,
        });
        localStorage.setItem("companyToken", res.data.token);
        localStorage.setItem("companyInfo", JSON.stringify(res.data.company));
        nav("/company/dashboard");
      }
    } catch (err) {
      if (
        err.response &&
        err.response.data &&
        (err.response.data.error || err.response.data.message)
      ) {
        setError(err.response.data.error || err.response.data.message);
      } else {
        setError("Login failed. Please try again.");
      }
    }
  };

  const labelForIdentifier =
    role === "admin" ? "Admin username or email" : "Email";

  return (
    <Layout>
      <div className="flex justify-center items-center py-20 bg-gradient-to-r from-blue-50 to-blue-100">
        <form
          onSubmit={handle}
          className="bg-white shadow-xl p-10 rounded-xl w-96 space-y-5 hover:shadow-2xl transition duration-300"
        >
          <h2 className="text-3xl font-bold text-blue-600 text-center">
            Login
          </h2>

          <div className="flex justify-center gap-2">
            {[
              { key: "user", label: "Student / User" },
              { key: "company", label: "Company" },
              { key: "admin", label: "Admin" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRole(opt.key)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  role === opt.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-600 border-blue-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-2 text-center text-sm font-semibold">
              {error}
            </div>
          )}

          <input
            type={role === "admin" ? "text" : "email"}
            placeholder={labelForIdentifier}
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setData({ ...data, identifier: e.target.value.trim() })
            }
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500"
            onChange={(e) =>
              setData({ ...data, password: e.target.value })
            }
          />
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-green-500 transition font-semibold">
            Login
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Login;

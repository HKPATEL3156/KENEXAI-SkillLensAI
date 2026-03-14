import Layout from "../components/Layout";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const navigate = useNavigate();

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Name validation
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;
    if (!nameRegex.test(data.name)) {
      setError("Name must be 3-50 characters long and contain only letters and spaces.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(data.password)) {
      setError(
        "Password must be at least 8 characters long, include an uppercase letter, a number, and a special character."
      );
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/api/auth/signup", data);
      setSuccess(response.data.message);
      setTimeout(() => navigate("/login"), 2000); // Redirect to login after 2 seconds
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-center py-20 bg-gradient-to-r from-blue-50 to-blue-100">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-xl p-10 rounded-xl w-96 space-y-5 hover:shadow-2xl transition duration-300"
        >
          <h2 className="text-3xl font-bold text-blue-600 text-center">
            Create Account
          </h2>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}

          <input
            type="text"
            placeholder="Full Name"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setData({ ...data, name: e.target.value })}
            required
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setData({ ...data, email: e.target.value })}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setData({ ...data, password: e.target.value })}
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-green-500 transition font-semibold"
          >
            Sign Up
          </button>

          <p className="text-sm text-center">
            Already have an account?
            <span
              onClick={() => navigate("/login")}
              className="text-blue-600 cursor-pointer hover:text-purple-600 ml-1"
            >
              Login
            </span>
          </p>
        </form>
      </div>
    </Layout>
  );
};

export default Register;

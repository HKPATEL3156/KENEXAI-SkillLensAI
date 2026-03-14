import Layout from "../components/Layout"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

const Login = () => {
  const nav = useNavigate()
  const [data, setData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")

  const handle = async (e) => {
    e.preventDefault()
    setError("")
    try {
      const res = await api.post("/auth/login", data)
      localStorage.setItem("token", res.data.token)
      nav("/dashboard")
    } catch (err) {
      if (err.response && err.response.data && (err.response.data.error || err.response.data.message)) {
        setError(err.response.data.error || err.response.data.message)
      } else {
        setError("Login failed. Please try again.")
      }
    }
  }

  return (
    <Layout>
      <div className="flex justify-center items-center py-20 bg-gradient-to-r from-blue-50 to-blue-100">
        <form onSubmit={handle} className="bg-white shadow-xl p-10 rounded-xl w-96 space-y-5 hover:shadow-2xl transition duration-300">
          <h2 className="text-3xl font-bold text-blue-600 text-center">Login</h2>
          {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-2 text-center text-sm font-semibold">{error}</div>}
          <input type="email" placeholder="Email"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500"
            onChange={e => setData({ ...data, email: e.target.value })}
          />
          <input type="password" placeholder="Password"
            className="w-full border p-3 rounded focus:ring-2 focus:ring-blue-500"
            onChange={e => setData({ ...data, password: e.target.value })}
          />
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-green-500 transition font-semibold">
            Login
          </button>
        </form>
      </div>
    </Layout>
  )
}

export default Login

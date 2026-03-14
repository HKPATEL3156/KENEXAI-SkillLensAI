import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./components/Register";
import DashboardRoutes from "./routes/Dashboardroutes";
import QuizPage from "./pages/QuizPage";
import CompanyRegister from "./pages/CompanyRegister";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegister from "./pages/AdminRegister";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/company/register" element={<CompanyRegister />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Exam route - standalone full-screen page (no dashboard layout) */}
        <Route path="/exam" element={<QuizPage />} />
        <Route path="/exam/:attemptId" element={<QuizPage />} />

        {/* Dashboard Routes */}
        <Route path="/*" element={<DashboardRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
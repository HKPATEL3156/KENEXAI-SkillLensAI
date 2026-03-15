import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./components/Register";
import DashboardRoutes from "./routes/Dashboardroutes";
import QuizPage from "./pages/QuizPage";
import CompanyRegister from "./pages/CompanyRegister";
import CompanyDashboardHome from "./pages/CompanyDashboardHome";
import CompanyPanel from "./pages/CompanyPanel";
import CompanyCandidates from "./pages/CompanyCandidates";
import CompanyProfilePage from "./pages/CompanyProfilePage";
import CompanyJobRoles from "./pages/CompanyJobRoles";
import CompanyAnalytics from "./pages/CompanyAnalytics";
import CompanySettings from "./pages/CompanySettings";
import ApplicantDetail from "./pages/ApplicantDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRegister from "./pages/AdminRegister";
import AdminUsers from "./pages/AdminUsers";
import AdminCompanies from "./pages/AdminCompanies";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminPending from "./pages/AdminPending";
import CandidateProfileView from "./pages/CandidateProfileView";
import AdminWarehouse from "./pages/AdminWarehouse";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/company/register" element={<CompanyRegister />} />
        {/* Company login reuses unified Login with company role preselected */}
        <Route path="/company/login" element={<Login defaultRole="company" />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/companies" element={<AdminCompanies />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/pending" element={<AdminPending />} />
        <Route path="/admin/warehouse" element={<AdminWarehouse />} />

        {/* Company Dashboard Routes */}
        <Route path="/company/dashboard" element={<CompanyDashboardHome />} />
        <Route path="/company/panel" element={<CompanyPanel />} />
        <Route path="/company/job-roles" element={<CompanyJobRoles />} />
        <Route path="/company/candidates" element={<CompanyCandidates />} />
        <Route path="/company/analytics" element={<CompanyAnalytics />} />
        <Route path="/company/settings" element={<CompanySettings />} />
        <Route path="/company/profile" element={<CompanyProfilePage />} />
        <Route path="/company/applications/:id" element={<ApplicantDetail />} />

        {/* Exam route - standalone full-screen page (no dashboard layout) */}
        <Route path="/exam" element={<QuizPage />} />
        <Route path="/exam/:attemptId" element={<QuizPage />} />

        {/* Candidate profile view for recruiters */}
        <Route path="/candidate/:candidateId" element={<CandidateProfileView />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard/*" element={<DashboardRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
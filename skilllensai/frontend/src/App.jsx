import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./components/Register";
import DashboardRoutes from "./routes/Dashboardroutes";
import QuizPage from "./pages/QuizPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
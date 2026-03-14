import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ isLanding }) => {
  const nav = useNavigate();
  const location = useLocation();

  const scrollToSection = (id) => {
    const section = document.querySelector(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isAdminLoggedIn =
    typeof window !== "undefined" && !!localStorage.getItem("adminToken");

  const handleAdminLogout = () => {
    localStorage.removeItem("adminToken");
    nav("/");
  };

  const onAdminDashboard = location.pathname.startsWith("/admin");

  return (
    <nav className="fixed top-0 z-50 w-full bg-gradient-to-r from-blue-600 to-indigo-800 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <div className="flex items-center gap-3">
            {/* Icon Container */}
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-3 shadow-lg">
              <i className="fas fa-brain text-xl text-white" />
            </div>

            {/* Brand Name */}
            <span className="text-3xl font-extrabold tracking-wide text-white">
              SkillLens <span className="text-yellow-400">AI</span>
            </span>
          </div>
        </Link>

        {/* Menu */}
        <div className="hidden items-center gap-8 font-semibold text-white md:flex">
          {isLanding && !isAdminLoggedIn && (
            <>
              <a
                href="#features"
                onClick={() => scrollToSection("#features")}
                className="transition duration-300 hover:text-yellow-300"
              >
                Features
              </a>
              <a
                href="#how"
                onClick={() => scrollToSection("#how")}
                className="transition duration-300 hover:text-yellow-300"
              >
                How It Works
              </a>
              <a
                href="#reviews"
                onClick={() => scrollToSection("#reviews")}
                className="transition duration-300 hover:text-yellow-300"
              >
                Reviews
              </a>
              <a
                href="#about"
                onClick={() => scrollToSection("#about")}
                className="transition duration-300 hover:text-yellow-300"
              >
                About Us
              </a>
            </>
          )}

          {!isAdminLoggedIn && (
            <>
              <Link
                to="/login"
                className="transition duration-300 hover:text-yellow-300"
              >
                Login
              </Link>

              <Link to="/register">
                <button className="rounded-lg bg-yellow-400 px-6 py-2 text-blue-900 shadow-lg transition duration-300 hover:bg-yellow-500">
                  Get Started Free
                </button>
              </Link>
            </>
          )}

          {isAdminLoggedIn && (
            <div className="flex items-center gap-3">
              {!onAdminDashboard && (
                <Link
                  to="/admin/dashboard"
                  className="text-sm transition duration-300 hover:text-yellow-300"
                >
                  Admin Dashboard
                </Link>
              )}
              <button
                onClick={handleAdminLogout}
                className="rounded-lg border border-white/30 px-4 py-1.5 text-sm text-white transition duration-300 hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

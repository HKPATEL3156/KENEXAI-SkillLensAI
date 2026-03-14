import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaGraduationCap,
  FaBriefcase,
  FaChalkboardTeacher,
  FaTasks,
  FaCog,
  FaSignOutAlt,
  FaSearch,
} from "react-icons/fa";

const Dsidebar = ({ isOpen }) => {
  return (
    <aside
      className={`bg-blue-800 text-white h-screen pt-16 flex-shrink-0 transition-all duration-300 shadow-lg ${isOpen ? 'w-64' : 'w-16'}`}
    >
      <nav className="flex flex-col space-y-4 p-4">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center p-2 rounded hover:bg-blue-700 ${
              isActive ? "bg-blue-700" : ""
            }`
          }
        >
          <FaTasks className="text-xl" />
          {isOpen && <span className="ml-4">Home</span>}
        </NavLink>
        <NavLink
          to="/dashboard/profile"
          className={({ isActive }) =>
            `flex items-center p-2 rounded hover:bg-blue-700 ${
              isActive ? "bg-blue-700" : ""
            }`
          }
        >
          <FaUser className="text-xl" />
          {isOpen && <span className="ml-4">My Profile</span>}
        </NavLink>
        <NavLink
          to="/dashboard/academics"
          className={({ isActive }) =>
            `flex items-center p-2 rounded hover:bg-blue-700 ${
              isActive ? "bg-blue-700" : ""
            }`
          }
        >
          <FaGraduationCap className="text-xl" />
          {isOpen && <span className="ml-4">My Academics</span>}
        </NavLink>
        <NavLink
          to="/dashboard/career"
          className={({ isActive }) =>
            `flex items-center p-2 rounded hover:bg-blue-700 ${
              isActive ? "bg-blue-700" : ""
            }`
          }
        >
          <FaBriefcase className="text-xl" />
          {isOpen && <span className="ml-4">My Career</span>}
        </NavLink>
        <NavLink
          to="/dashboard/coach"
          className={({ isActive }) =>
            `flex items-center p-2 rounded hover:bg-blue-700 ${
              isActive ? "bg-blue-700" : ""
            }`
          }
        >
          <FaChalkboardTeacher className="text-xl" />
          {isOpen && <span className="ml-4">SkillLens AI Coach</span>}
        </NavLink>
        {/* Job Finder: navigate with suggested role if available */}
        <JobFinderNav isOpen={isOpen} />
        <NavLink
          to="/dashboard/activity"
          className={({ isActive }) =>
            `flex items-center p-2 rounded hover:bg-blue-700 ${
              isActive ? "bg-blue-700" : ""
            }`
          }
        >
          <FaTasks className="text-xl" />
          {isOpen && <span className="ml-4">My Activity</span>}
        </NavLink>
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            `flex items-center p-2 rounded hover:bg-blue-700 ${
              isActive ? "bg-blue-700" : ""
            }`
          }
        >
          <FaCog className="text-xl" />
          {isOpen && <span className="ml-4">Settings</span>}
        </NavLink>
      </nav>
    </aside>
  );
};

const JobFinderNav = ({ isOpen }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    const role = (typeof window !== 'undefined') ? localStorage.getItem('suggestedRole') : null;
    if (role) {
      navigate(`/dashboard/jobs?role=${encodeURIComponent(role)}`);
    } else {
      navigate('/dashboard/jobs');
    }
  };

  return (
    <div onClick={handleClick} className={`flex items-center p-2 rounded hover:bg-blue-700 cursor-pointer`}>
      <FaSearch className="text-xl" />
      {isOpen && <span className="ml-4">Job Finder</span>}
    </div>
  );
};

export default Dsidebar;
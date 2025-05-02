import React, { useState } from 'react';
import './Sidebar.css';
import { MdDashboard } from 'react-icons/md';
import { FaUserNinja } from 'react-icons/fa';
import { FiUsers } from 'react-icons/fi';
import { LiaIndustrySolid } from 'react-icons/lia';
import { MdInterests, MdDomain } from 'react-icons/md';
import { GoChevronDown } from 'react-icons/go';
import { Link, useLocation } from 'react-router-dom';
import { Image } from 'react-bootstrap';

function Sidebar({ isActive }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen((prev) => !prev);
  };

  const toggleDropdown = (label) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  };

  const menuItems = [
    { path: '/', icon: <MdDashboard />, label: 'Dashboard' },
    { path: '/profile', icon: <FaUserNinja />, label: 'Profile Management' },
    {
      icon: <FiUsers />,
      label: 'Content Management',
      dropdown: true,
      children: [
        { path: '/ViewRegList', label: 'View Registered List' },
        { path: '/AddUser', label: 'Add New User' },
      ],
    },
    { path: '/industries', icon: <LiaIndustrySolid />, label: 'Analytics and Reporting ' },
    { path: '/interests', icon: <MdInterests />, label: 'Support Management' },
    { path: '/interests', icon: <MdInterests />, label: 'Manage Finance' },
    { path: '/interests', icon: <MdInterests />, label: 'CRM' },
    { path: '/interests', icon: <MdInterests />, label: 'Account Settings' },
    { path: '/signin', icon: <MdDomain />, label: 'Sign In' },
  ];

  return (
    <>
      <aside id="sidebar" className={`sidebar ${isActive ? 'active' : ''}`}>

        <div className="AdminLogo">
          <Link to="/">
            <Image className='deskimg' src="/Images/Logo.png" alt="Logo" width={80} height={80}/>
            <Image className='mobimg' src="/Images/Logo.png" alt="Logo" width={40} height={40}/>
          </Link>
        </div>

        <ul className="sidebar_Ul" id="Sidebar_Ul">
  
          {/* Admin Profile */}
          <li className="AdminProfile">
            <Link to="#" onClick={toggleProfileDropdown} className="sidebar-link">
              <div className="sidebar-left">
                <img src="/Images/admin.jpg" alt="AdminImage" width={30} height={30} className="admin-img" />
                <span>Brooklyn Alice</span>
              </div>
              <GoChevronDown className={`dropdown-icon ${profileDropdownOpen ? 'open' : ''}`} />
            </Link>
          </li>

          <div className={`collapse UserProfileDiv ${profileDropdownOpen ? 'show' : ''}`} >
            <ul>
              <li>
                <Link to="/Adminprofile">
                  <span> MP </span>
                  <span> My Profile </span>
                </Link>
              </li>
              <li>
                <Link to="/settingprofile">
                  <span> S </span>
                  <span> Settings </span>
                </Link>
              </li>
              <li>
                <Link to="/signin">
                  <span> L </span>
                  <span> Logout </span>
                </Link>
              </li>
            </ul>
          </div>

          <hr className="horizontal dark mt-0" />

          {menuItems.map((item, index) => (
            <li key={index} className={`nav_item ${currentPath === item.path ? 'active' : ''}`}>

              {item.dropdown ? (
                <>
                  <Link to="#" onClick={() => toggleDropdown(item.label)} className="sidebar-link">
                    <div className="sidebar-left">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <GoChevronDown className={`dropdown-icon ${openDropdown === item.label ? 'open' : ''}`} />
                  </Link>
                  <div className={`collapse ${openDropdown === item.label ? 'show' : ''}`}>
                    <ul>
                      {item.children.map((child, idx) => (
                        <li
                          key={idx}
                          className={`nav_item ${currentPath === child.path ? 'active' : ''}`}>
                          <Link to={child.path} className="sidebar-link">
                            <div className="sidebar-left">
                              <span>{child.label}</span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <Link to={item.path} className="sidebar-link">
                  <div className="sidebar-left">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </Link>
              )}


            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}

export default Sidebar;

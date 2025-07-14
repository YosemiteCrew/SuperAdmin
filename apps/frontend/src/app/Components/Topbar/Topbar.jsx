'use client';
import React, { useState, useEffect } from 'react';
import './Topbar.css';
import { Button } from 'react-bootstrap';
import { FaBars, FaBarsStaggered } from "react-icons/fa6";
import { BiSearch } from 'react-icons/bi';
import Link from 'next/link';
import { GoChevronDown } from 'react-icons/go';
import Image from 'next/image';








function Topbar({ toggleSidebar , DashName }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  
  const [theme] = useState('light');

  // Toggle Sidebar & Icon Change
  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
    toggleSidebar(); // Call the parent function
  };

  // Apply theme to body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);


  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen((prev) => !prev);
  };

  // LogOut 
  const logout = () => {
    localStorage.removeItem("token");
    router.push("/Auth/Login");
  };

  return (
    <div className="TopBar">

      <div className="LftTpBar">
        <Button type="button" onClick={handleToggleSidebar}>
          {isSidebarOpen ? <FaBars className="toggle-sidebar-btn" /> : <FaBarsStaggered className="toggle-sidebar-btn" />}
        </Button>
        <h4>{DashName}</h4>
      </div>
      <div className="RytTpBar">
        <div className="ass">
          {/* Admin Profile */}
            <div className="AdminProfile">
              <Link href="#" onClick={toggleProfileDropdown} className="UserDiv">
                <div className="UserProfile">
                  <Image aria-hidden src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="AdminImage" width={40} height={40} />
                  <h4>Brooklyn Alice</h4>
                </div>
                <GoChevronDown className={`dropdown-icon ${profileDropdownOpen ? 'open' : ''}`} />
              </Link>
            </div>
  
            <div className={`collapse UserProfileDiv ${profileDropdownOpen ? 'show' : ''}`} >
              <ul>
                <li>
                  <Link href="/Adminprofile">
                    <span> My Profile </span>
                  </Link>
                </li>
                <li>
                  <Link href="/settingprofile">
                    <span> Settings </span>
                  </Link>
                </li>
                <li>
                  <Link href="/Auth/Login" onClick={logout}>
                    <span> Logout </span>
                  </Link>
                </li>
              </ul>
            </div>
        </div>

        <div className="search-box">
          <Button className="btn-search">
            <BiSearch className="search-icon" />
          </Button>
          <input
            type="text"
            className="input-search"
            placeholder="Type to Search..."
            onFocus={(e) => e.currentTarget.parentNode.classList.add('active')}
            onBlur={(e) => e.currentTarget.parentNode.classList.remove('active')}
          />
        </div>

        
      </div>
      
      
    </div>
  );
}

export default Topbar;

'use client';
import React, { useState, useEffect } from 'react';
import './Topbar.css';
import { Button } from 'react-bootstrap';
import { FaBars, FaBarsStaggered } from "react-icons/fa6";
import { BiSearch } from 'react-icons/bi';
import Link from 'next/link';
import { GoChevronDown } from 'react-icons/go';








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
                      <Link href="#" onClick={toggleProfileDropdown} className="sidebar-link">
                        <div className="sidebar-left">
                          <img src="/Images/admin.jpg" alt="AdminImage" width={30} height={30} className="admin-img" />
                          <span>Brooklyn Alice</span>
                        </div>
                        <GoChevronDown className={`dropdown-icon ${profileDropdownOpen ? 'open' : ''}`} />
                      </Link>
                    </div>
          
                    <div className={`collapse UserProfileDiv ${profileDropdownOpen ? 'show' : ''}`} >
                      <ul>
                        <li>
                          <Link href="/Adminprofile">
                            <span> MP </span>
                            <span> My Profile </span>
                          </Link>
                        </li>
                        <li>
                          <Link href="/settingprofile">
                            <span> S </span>
                            <span> Settings </span>
                          </Link>
                        </li>
                        <li>
                          <Link href="#">
                            <span> L </span>
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

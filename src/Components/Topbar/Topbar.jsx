import React, { useState, useEffect } from 'react';
// import { FaSun, FaMoon } from 'react-icons/fa'; 
import './Topbar.css';
import { Button } from 'react-bootstrap';
import { FaBars, FaBarsStaggered } from "react-icons/fa6";
// import { Link } from 'react-router-dom';
// import { IoNotificationsSharp } from 'react-icons/io5';
import Notification from '../Notification/Notification ';
import { BiSearch } from 'react-icons/bi';








function Topbar({ toggleSidebar }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  
  const [theme, setTheme] = useState('light');

  // Toggle Sidebar & Icon Change
  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
    toggleSidebar(); // Call the parent function
  };

  // Apply theme to body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // const toggleTheme = () => {
  //   setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  // };

  return (
    <div className="TopBar">

      <div className="LftTpBar">
        {/* <Button type="Submit" onClick={toggleSidebar}> <FaBarsStaggered className="toggle-sidebar-btn" /></Button> */}
        <Button type="button" onClick={handleToggleSidebar}>
          {isSidebarOpen ? <FaBars className="toggle-sidebar-btn" /> : <FaBarsStaggered className="toggle-sidebar-btn" />}
        </Button>
        <h4>Admin DashBoard</h4>
      </div>
      <div className="RytTpBar">

        <div className="search-box">
          <button className="btn-search">
            <BiSearch className="search-icon" />
          </button>
          <input
            type="text"
            className="input-search"
            placeholder="Type to Search..."
            onFocus={(e) => e.currentTarget.parentNode.classList.add('active')}
            onBlur={(e) => e.currentTarget.parentNode.classList.remove('active')}
          />
        </div>



        <Notification />
        
        


      </div>
      
      

      {/* <button className="theme-toggle-btn" onClick={toggleTheme}>
        {theme === 'light' ? (
          <FaMoon size={20} color="#555" />
        ) : (
          <FaSun size={20} color="#FFD700" />
        )}
      </button> */}




    </div>
  );
}

export default Topbar;

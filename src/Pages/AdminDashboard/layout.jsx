import React, { useState } from 'react'
import "./AdminDashboard.css"
import Sidebar from '../../Components/Sidebar/Sidebar'
import Topbar from '../../Components/Topbar/Topbar'

export default function AdminDashboardLayout({ children }) {

  
  // Add Active class heasder nd sidebar 
  const [isSidebarActive, setIsSidebarActive] = useState(false);
  const toggleSidebar = () => {
    setIsSidebarActive(!isSidebarActive);
  };
  // Add Active class heasder nd sidebar 


  return (
    <>

    <section className={`AdminDashboardSec ${isSidebarActive ? "active" : ""}`} >
      <Sidebar isActive={isSidebarActive}/>
      <div className="Main_Content">
        <Topbar toggleSidebar={toggleSidebar}/>
        <div className="DashContent">
          {children}
        </div>
      </div>
    </section>
    
    
    
    </>
  )
}


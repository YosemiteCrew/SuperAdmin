'use client';
import React, { memo, useState } from 'react';
import './Sidebar.css';
import { MdDashboard } from 'react-icons/md';
import { FiUsers } from 'react-icons/fi';
import { LiaIndustrySolid } from 'react-icons/lia';
import { MdInterests } from 'react-icons/md';
import { GoChevronDown } from 'react-icons/go';


import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaUser } from 'react-icons/fa6';
// Import your authService here. Adjust the path as needed.


interface SidebarProps {
  isActive: boolean;
}

function Sidebar({ isActive }: SidebarProps) {
  const currentPath = usePathname();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (label: string | null) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  };

  const menuItems = [
    { path: '/', icon: <MdDashboard />, label: 'Dashboard' },
    {
      icon: <FiUsers />,
      label: 'Client & CRM',
      dropdown: true,
      children: [
        { Cpath: '/crmdashboard', label: 'All Businesses' },
        { Cpath: '/crmhospital', label: 'Hospitals' },
        { Cpath: '/crmgroomers', label: 'Groomers' },
        { Cpath: '/crmbreeders', label: 'Breeders' },
        { Cpath: '/crmsitters', label: 'Sitters' },
        { Cpath: '/crmpetparents', label: 'Pet Parents' },
        { Cpath: '/crmsupporttickets', label: 'Support Tickets' },
        { Cpath: '/businessleads', label: 'Business Leads' },
      ],
    },
    {
      icon: <FiUsers />,
      label: 'Content Management',
      dropdown: true,
      children: [
        { Cpath: '#', label: 'All Businesses' },
        { Cpath: '#', label: 'Hospitals' },
        { Cpath: '#', label: 'Groomers' },
        { Cpath: '#', label: 'Breeders' },
        { Cpath: '#', label: 'Sitters' },
        { Cpath: '#', label: 'Pet Parents' },
        { Cpath: '#', label: 'Support Tickets' },
        { Cpath: '#', label: 'Business Leads' },
      ],
    },
    { path: '#', icon: <LiaIndustrySolid />, label: 'Analytics & Reports ' },
    { path: '#', icon: <MdInterests />, label: 'Financials' },
    {
      icon: <FaUser/>,
      label: 'User Management',
      dropdown: true,
      children: [
        { Cpath: '/teammember', label: 'Team Members' },
        { Cpath: '#', label: 'Activity Logs' },
      ],
    },
    { path: '#', icon: <MdInterests />, label: 'Communication' }
  ];

  return (
    <>
      <aside id="sidebar" className={`sidebar ${isActive ? 'active' : ''}`}>

        <div className="AdminLogo">
          <Link href="/">
            <Image className='deskimg' src="/Images/fullLogo.png" alt="Logo" width={80} height={80}/>
            <Image className='mobimg' src="/Images/fullLogo.png" alt="Logo" width={40} height={40}/>
          </Link>
        </div>

        <hr className="horizontal dark mt-0" />

        <ul className="sidebar_Ul" id="Sidebar_Ul">
  
          {menuItems.map((item, index) => (
            <li key={index} className={`nav_item ${currentPath === item.path ? 'active' : ''}`}>

              {item.dropdown ? (
                <>

                  <Link href="#" onClick={() => toggleDropdown(item.label)} className="sidebar-link">
                    <div className="sidebar-left">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <GoChevronDown className={`dropdown-icon ${openDropdown === item.label ? 'open' : ''}`} />
                  </Link>

                  <div className={`collapse ${openDropdown === item.label ? 'show' : ''}`}>
                    <ul className='dropdownUl'>
                      {item.children.map((child, idx) => (
                        <li
                          key={idx}
                          className="nav_item">
                          <Link href={child.Cpath} className={`sidebar-link ${currentPath === child.Cpath ? 'active' : ''}`}>
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
                <Link href={item.path} className="sidebar-link">
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

export default memo(Sidebar);

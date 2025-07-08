"use client";
import React, { useState } from "react";
import "./UserManangement.css"
import AdminDashboardLayout from '../AdminDashboard/layout'
import { Container, Dropdown } from 'react-bootstrap'
import Image from 'next/image'
import { CommonBTN } from '../CRMPage/CRMBusinessLead/CRMBusinessLead'
import { FaUserPlus } from 'react-icons/fa6'
import { FiSearch } from 'react-icons/fi'
import UserManagementTable from "@/app/Components/DataTable/UserManagementTable";

function TeamMenber() {

    // Source status 
    const tblstatusOptions = ['Status1', 'Status2', 'Status3'];
    const [tblstatus, setTblStatus] = useState<string>('Status');
    const handleTblStatusDropdownSelect = (eventKey: string | null) => {
    if (eventKey) setTblStatus(eventKey);};


  return (
    <>
        <AdminDashboardLayout>
            <section className='UserManangementSec'>
                <Container fluid>
                    <div className="UserMemberData">

                        <div className="BusinessTopDiv">
                            <div className="leftBusiness">
                                <h2>User Management</h2>
                                <span className='blue'><Image aria-hidden src="/Images/notify.png" alt="notify" width={20} height={20}/> 8 New Notification</span>
                            </div>
                            <div className="RightBusiness">
                                <CommonBTN icon={<FaUserPlus size={20}/>} path="#" label="Add New Members"/>
                            </div>
                        </div>

                        <div className="userTeamTableDiv">

                            <div className="TableBlankSelect">
                                <div className="lftSpace"><h5>User Management Team Members</h5></div>
                                <div className="RightSpace">
                                    <div className="srch">
                                        <input type="search" placeholder="Search User name, Role." />
                                        <FiSearch />
                                    </div>
                                    
                                    <div className="SpaceDropdown">
                                        <Dropdown onSelect={handleTblStatusDropdownSelect}>
                                        <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-status">
                                            {tblstatus}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            {tblstatusOptions.map((opt) => (
                                            <Dropdown.Item eventKey={opt} key={opt} active={tblstatus === opt}>
                                                {opt}
                                            </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                </div>
                            </div>
                            <UserManagementTable/>
                        </div>

                    </div>
                </Container>
            </section>
        </AdminDashboardLayout>
    </>
  )
}

export default TeamMenber
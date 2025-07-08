"use client";
import React, { useState } from "react";
import "../CRMPage.css"
import AdminDashboardLayout from '../../AdminDashboard/layout'
import { Container } from 'react-bootstrap'
import { CommonBTN, CommonSelectHead } from '../CRMBusinessLead/CRMBusinessLead'
import { IoAddCircle } from 'react-icons/io5'
import Image from 'next/image'
import { DashInfoCard } from '@/app/Components/DashCard/DashCard'
import { FaStar, FaUser } from 'react-icons/fa6'
import { HiMiniUserPlus } from 'react-icons/hi2'
import { AiFillMessage } from 'react-icons/ai'

function CRMSupportTicket() {
    const statusOptions = ['Last 30 Days', 'Last 60 Days', 'Last 90 Days'];
    const [status, setStatus] = useState<string>('Last 30 Days');
    const handleDropdownSelect = (eventKey: string | null) => {
    if (eventKey) setStatus(eventKey);};


  return (
    <>

    <AdminDashboardLayout>
        <section className='CRMSupportSec'>
            <Container fluid>
                <div className="SupportTicketsData">


                    <div className="BusinessTopDiv">
                        <div className="leftBusiness">
                            <h2>Support Tickets</h2>
                            <span className='blue'><Image aria-hidden src="/Images/sms.png" alt="sms" width={20} height={20}/> 5 New Tickets</span>
                            <span className='red'><Image aria-hidden src="/Images/danger.png" alt="danger" width={20} height={20}/> 2 Escalated</span>
                            <span className='grey'><Image aria-hidden src="/Images/reload.png" alt="reload" width={20} height={20}/> 10 Reopened</span>
                        </div>
                        <div className="RightBusiness">
                            <CommonBTN icon={<IoAddCircle size={20} />} path="#" label="Create Ticket"/>
                        </div>
                    </div>

                    <div>
                        <CommonSelectHead handleDropdownSelect={handleDropdownSelect} status={status} statusOptions={statusOptions}/>
                        <div className="BuissnessCards">
                            <DashInfoCard DashIcon={<FaUser/>} UserName="Total Users" CrdNumb="2639" RatioIcon="" RatioText="" RatioCL="Done"/>
                            <DashInfoCard DashIcon={<HiMiniUserPlus/>} UserName="New Signups" CrdNumb="288" RatioIcon="" RatioText="" RatioCL="Error"/>
                            <DashInfoCard DashIcon={<FaStar />} UserName="Daily Active Users" CrdNumb="697" RatioIcon="" RatioText="" RatioCL="Done"/>
                            <DashInfoCard DashIcon={<AiFillMessage/>} UserName="New Support Tickets" CrdNumb="113" RatioIcon="" RatioText="" RatioCL="Done"/>
                        </div>
                    </div>









                </div>
            </Container>
        </section>
    </AdminDashboardLayout>
    </>
  )
}

export default CRMSupportTicket
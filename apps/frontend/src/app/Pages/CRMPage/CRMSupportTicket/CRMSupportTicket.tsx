"use client";
import React, { useState, useEffect } from "react";
import "../CRMPage.css"
import AdminDashboardLayout from '../../AdminDashboard/layout'
import { Container, Row, Col } from 'react-bootstrap'
import { CommonBTN, CommonSelectHead } from '../CRMBusinessLead/CRMBusinessLead'
import { IoAddCircle } from 'react-icons/io5'
import Image from 'next/image'
import { DashInfoCard } from '@/app/Components/DashCard/DashCard'
import { FaStar, FaUser } from 'react-icons/fa6'
import { HiMiniUserPlus } from 'react-icons/hi2'
import { AiFillMessage } from 'react-icons/ai'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import CommonTabs from '@/app/Components/CommonTabs/CommonTabs'
import CreateSupportTicketModal from '@/app/Components/Modals/CreateSupportTicketModal'
import supportTicketService, { DashboardStats, UnresolvedTicket } from '@/app/services/supportTicketService'
import { Icon } from "@iconify/react/dist/iconify.js";
import SupportTicketsTable from "@/app/Components/DataTable/SupportTicketsTable";

function CRMSupportTicket() {
    const statusOptions = ['Last 30 Days', 'Last 60 Days', 'Last 90 Days'];
    const [status, setStatus] = useState<string>('Last 30 Days');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        newTickets: 0,
        escalatedTickets: 0,
        reopenedTickets: 0,
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
        avgResolutionTimeDays: 0,
        avgResponseTimeMinutes: 0
    });
    const [unresolvedTickets, setUnresolvedTickets] = useState<UnresolvedTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [unresolvedLoading, setUnresolvedLoading] = useState(true);

    // Convert status option to days
    const getPeriodDays = (statusOption: string): number => {
        switch (statusOption) {
            case 'Last 30 Days':
                return 30;
            case 'Last 60 Days':
                return 60;
            case 'Last 90 Days':
                return 90;
            default:
                return 30;
        }
    };
    useEffect(() => {
        const periodDays = getPeriodDays(status);
        fetchDashboardStats(periodDays);
        fetchUnresolvedTickets(periodDays);
    }, [status]); // Re-fetch when status changes
    
    useEffect(() => {
        fetchDashboardStats();
        fetchUnresolvedTickets();
    }, []);
    const fetchDashboardStats = async (periodDays: number = 30) => {
        try {
            setLoading(true);
            const response = await supportTicketService.getDashboardStats(periodDays);
            if (response.success) {
                setDashboardStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };
    const fetchUnresolvedTickets = async (periodDays: number = 30) => {
        try {
            setUnresolvedLoading(true);
            const response = await supportTicketService.getUnresolvedTickets(5,periodDays);
            if (response.success) {
                setUnresolvedTickets(response.data);
            }
        } catch (error) {
            console.error('Error fetching unresolved tickets:', error);
        } finally {
            setUnresolvedLoading(false);
        }
    };

    const handleDropdownSelect = (eventKey: string | null) => {
        if (eventKey) setStatus(eventKey);
    };

    const handleCreateTicket = () => {
        setShowCreateModal(true);
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
    };

    // Sample data for charts
    // const ticketStatusData = [
    //     { name: 'Closed', value: 333, color: '#E5E5E5' },
    //     { name: 'Open', value: 64, color: '#222222' }
    // ];
    const ticketStatusData = [
        { name: 'Closed', value: dashboardStats.closedTickets, color: '#222222' },
        { name: 'Open', value: dashboardStats.openTickets, color: '#E5E5E5' }
    ];

    const topIssuesData = [
        { name: 'Login', percentage: 38 },
        { name: 'Appointment', percentage: 18 },
        { name: 'Profile', percentage: 14 },
        { name: 'Slow', percentage: 16 },
        { name: 'Payment', percentage: 11 },
        { name: 'Sync', percentage: 3 }
    ];

    // const unresolvedTickets = [
    //     { id: 'T208', status: 'In Progress', days: 17 },
    //     { id: 'T297', status: 'Escalated', days: 13 },
    //     { id: 'T312', status: 'Waiting', days: 11 },
    //     { id: 'T326', status: 'Reopened', days: 7 },
    //     { id: 'T357', status: 'Waiting', days: 4 }
    // ];

    const tabs = [
        {
            eventKey: 'professionals',
            title: 'Professionals',
             content: <SupportTicketsTable userType="professionals" />
           // content: <SupportTicketsTable />
        },
        {
            eventKey: 'petparents',
            title: 'Pet Parents',
            content: <SupportTicketsTable userType="petparents" />
            //content: <SupportTicketsTable  />
            
        }
    ];

    const getStatusClassName = (status: string) => {
        const statusMap: { [key: string]: string } = {
          'New Ticket': 'new-ticket',
          'In Progress': 'in-progress',
          'Waiting': 'waiting',
          'Escalated': 'escalated',
          'Reopened': 'reopened',
          'Closed': 'closed'
        };
        return statusMap[status] || 'new-ticket';
      };

    return (
        <>
            <AdminDashboardLayout>
                <section className='CRMSupportSec'>
                    <Container fluid>
                        <div className="SupportTicketsData">
                            {/* Header Section */}
                            <div className="BusinessTopDiv">
                                <div className="leftBusiness">
                                    <h2>Support Tickets</h2>
                                    <span className='blue'>
                                        <Image aria-hidden src="/Images/sms.png" alt="sms" width={20} height={20}/> 
                                        {loading ? '...' : `${dashboardStats.newTickets} New Tickets`}
                                    </span>
                                    <span className='red'>
                                        <Image aria-hidden src="/Images/danger.png" alt="danger" width={20} height={20}/> 
                                        {loading ? '...' : dashboardStats.escalatedTickets} Escalated
                                    </span>
                                    <span className='grey'>
                                        <Image aria-hidden src="/Images/reload.png" alt="reload" width={20} height={20}/> 
                                        {loading ? '...' : dashboardStats.reopenedTickets} Reopened
                                    </span>
                                </div>
                                <div className="RightBusiness">
                                    <CommonBTN 
                                        icon={<IoAddCircle size={20} />} 
                                        path="#" 
                                        label="Create Ticket"
                                        onClick={handleCreateTicket}
                                    />
                                </div>
                            </div>

                            {/* Filter Section */}
                            <div>
                                <CommonSelectHead 
                                    handleDropdownSelect={handleDropdownSelect} 
                                    status={status} 
                                    statusOptions={statusOptions}
                                />

                                <Row>
                                    <Col md={3}><DashInfoCard 
                                        DashIcon={<Icon icon="solar:book-bold" width="20" height="20" />} 
                                        UserName="Total Tickets" 
                                        CrdNumb={loading ? '...' : dashboardStats.totalTickets.toString()} 
                                        RatioIcon="" 
                                        RatioText="" 
                                        RatioCL="Done"
                                    /></Col>
                                    <Col md={3}><DashInfoCard 
                                        DashIcon={<Icon icon="solar:book-bold" width="20" height="20" />} 
                                        UserName="Open Tickets" 
                                        CrdNumb={loading ? '...' : dashboardStats.openTickets.toString()}  
                                        RatioIcon="" 
                                        RatioText="" 
                                        RatioCL="Error"
                                    /></Col>
                                    <Col md={3}><DashInfoCard 
                                        DashIcon={<Icon icon="solar:book-bold" width="20" height="20" />} 
                                        UserName="Avg. Resolution Time" 
                                        CrdNumb={loading ? '...' : `${dashboardStats.avgResolutionTimeDays} days`} 
                                        RatioIcon="" 
                                        RatioText="" 
                                        RatioCL="Done"
                                    /></Col>
                                    <Col md={3}><DashInfoCard 
                                        DashIcon={<Icon icon="solar:book-bold" width="20" height="20" />} 
                                        UserName="Avg Response Time" 
                                        CrdNumb={loading ? '...' : `${dashboardStats.avgResponseTimeMinutes} mins`}
                                        RatioIcon="" 
                                        RatioText="" 
                                        RatioCL="Done"
                                    /></Col>
                                </Row>
                                
                                
                            </div>

                            {/* Charts Section */}
                            <Row>
                            <Col md={6}>
                                <div className="BarGraphDiv">
                                    <div className="chart-header">
                                        <h5>Total Tickets</h5>
                                        <span className="total-count">{loading ? '...' : dashboardStats.totalTickets}</span>
                                    </div>
                                    <div className="pie-chart-container">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={ticketStatusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={0}
                                                    dataKey="value"
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    {ticketStatusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="chart-legend">
                                        <div className="legend-item">
                                            <div className="legend-color closed"></div>
                                            <span className="legend-text">Closed</span>
                                            <span className="legend-percentage">
                                                {dashboardStats.totalTickets > 0 ? Math.round((dashboardStats.closedTickets / dashboardStats.totalTickets) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="legend-item">
                                            <div className="legend-color open"></div>
                                            <span className="legend-text">Open</span>
                                            <span className="legend-percentage">
                                                {dashboardStats.totalTickets > 0 ? Math.round((dashboardStats.openTickets / dashboardStats.totalTickets) * 100) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Col>

                                {/* <Col md={6}>
                                    <div className="BarGraphDiv">
                                        <h5>Top Mentioned Issues</h5>
                                        <div className="bar-chart-container">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={topIssuesData} layout="horizontal" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <XAxis 
                                                        type="number" 
                                                        domain={[0, 45]} 
                                                        tick={{ fontSize: 12, fill: '#666' }}
                                                        axisLine={{ stroke: '#e0e0e0' }}
                                                        tickLine={{ stroke: '#e0e0e0' }}
                                                    />
                                                    <YAxis 
                                                        dataKey="name" 
                                                        type="category" 
                                                        width={80}
                                                        tick={{ fontSize: 12, fill: '#333' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <Tooltip 
                                                        formatter={(value) => [`${value}%`, 'Percentage']}
                                                        contentStyle={{
                                                            backgroundColor: 'white',
                                                            border: '1px solid #e0e0e0',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                                        }}
                                                    />
                                                    <Bar 
                                                        dataKey="percentage" 
                                                        fill="#333333" 
                                                        radius={[0, 4, 4, 0]}
                                                        barSize={20}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </Col> */}
                                <Col md={6}>
                                    <div className="BarGraphDiv">
                                        <h5>Top Unresolved Tickets</h5>
                                        <div className="unresolved-tickets-list">
                                            {unresolvedLoading ? (
                                                <div className="loading-unresolved">
                                                    <div className="spinner-border spinner-border-sm" role="status">
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                    <span>Loading unresolved tickets...</span>
                                                </div>
                                            ) : unresolvedTickets.length === 0 ? (
                                                <div className="no-unresolved-tickets">
                                                    <span>No unresolved tickets</span>
                                                </div>
                                            ) : (
                                                unresolvedTickets.map((ticket, index) => (
                                                    <div key={index} className="ticket-item">
                                                        <div className="ticket-info">
                                                            <span className="ticket-id">{ticket.id}</span>
                                                            <span className={`ticket-status ${getStatusClassName(ticket.status)}`}>
                                                                {ticket.status}
                                                            </span>
                                                        </div>
                                                        <span className="ticket-days">{ticket.days} d</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </Col>
                            </Row>

                            {/* Support Tickets Table Section */}
                            <div className="support-tickets-section">
                                <CommonTabs 
                                    tabs={tabs}
                                    defaultActiveKey="professionals"
                                    showStatusSelect={false}
                                    showCreateButton={false}
                                />
                            </div>
                        </div>
                    </Container>
                </section>
            </AdminDashboardLayout>

            {/* Create Support Ticket Modal */}
            <CreateSupportTicketModal 
                show={showCreateModal} 
                onHide={handleCloseModal} 
            />
        </>
    );
}

export default CRMSupportTicket;
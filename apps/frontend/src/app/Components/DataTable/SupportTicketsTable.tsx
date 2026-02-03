"use client";
import React, { useState, useEffect, useCallback} from 'react'
import "./DataTable.css"
import GenericTable from '../GenericTable/GenericTable'
import GenericTablePagination from '../GenericTable/GenericTablePagination'
import { Button, Dropdown, Form, Overlay, Tooltip} from 'react-bootstrap'
import {  BsThreeDotsVertical } from 'react-icons/bs';
import Image from 'next/image';
import { FaCircleCheck, FaEye, FaUser } from 'react-icons/fa6';
import supportTicketService, { DashboardStats } from '@/app/services/supportTicketService'
import Link from 'next/link';
import { LuSearch } from 'react-icons/lu';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';


// Define the Column type
type Column<T> = {
  label: string;
  key: keyof T | string;
  width?: string;
  render?: (item: T) => React.ReactNode;
};



type SupportTicketsItem = {
  _id: string;
  ticketId: string;
  emailAddress: string;
  category: string;
  message: string;
  createdAt: string;
  status: string;
};

interface SupportTicketsTableProps {
  userType?: 'professionals' | 'petparents';
}
type TicketCounts = {
  professionals: number;
  petParents: number;
};

// Sample Data
const appointments: SupportTicketsItem[] = [
  {
    ticketId: 'T204',
    _id: '1',
    emailAddress: 'johndeo@gmail.com',
    category: 'DSAR',
    message: "I can't log into my dashboard — it keeps saying 'user not found' even though I signed up last week.",
    createdAt: "26 June 2025",
    status: "Cancel",
  },
  {
    ticketId: 'T204',
    _id: '2',
    emailAddress: 'johndeo@gmail.com',
    category: 'DSAR',
    message: "I can't log into my dashboard — it keeps saying 'user not found' even though I signed up last week.",
    createdAt: "26 June 2025",
    status: "Cancel",
  },
 
];

const statusOptions = [
  { value: 'New Ticket', label: 'New Ticket', color: '#E6E6FA' },
  { value: 'In Progress', label: 'In Progress', color: '#ADD8E6' },
  { value: 'Waiting', label: 'Waiting', color: '#FFB347' },
  { value: 'Escalated', label: 'Escalated', color: '#FFB6C1' },
  { value: 'Reopened', label: 'Reopened', color: '#D3D3D3' },
  { value: 'Closed', label: 'Closed', color: '#90EE90' }
];





// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// const formatDate = (dateString: string) => {
//   const date = new Date(dateString);
//   const day = date.getDate();
//   const month = date.toLocaleString('en-US', { month: 'long' });
//   const year = date.getFullYear();
//   return `${day} ${month} ${year}`;
// };
// Format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}m ago`;
};





function SupportTicketsTable({ userType = 'professionals' }: SupportTicketsTableProps) {
  const [ticketCounts, setTicketCounts] = useState<TicketCounts>({ professionals: 0, petParents: 0 });
  const [ticketsData, setTicketsData] = useState<SupportTicketsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('User Type');
  const [categoryFilter, setCategoryFilter] = useState('Category');
  const [statusFilter, setStatusFilter] = useState('Status');

  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTarget, setTooltipTarget] = useState<HTMLElement | null>(null);
  const [tooltipMessage, setTooltipMessage] = useState('');

  // Filter options
  const userTypeOptions = ['All Users', 'Registered', 'Not Registered'];
  const categoryOptions = ['All Categories', 'General', 'DSAR', 'Technical', 'Billing'];
  const statusOptionsFilter = ['All Status', 'New Ticket', 'In Progress', 'Waiting', 'Escalated', 'Reopened', 'Closed'];
  // Fetch ticket counts
  const fetchTicketCounts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/support-tickets/counts/by-type`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ticket counts');
    }

    const data = await response.json();
    if (data.success) {
      setTicketCounts(data.data);
    }
  } catch (error) {
    console.error('Error fetching ticket counts:', error);
  }
};

 // Fetch tickets with filters
 const fetchTickets = useCallback(async (page: number = 1, search: string = '', category: string = '', status: string = '') => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString()
      });

      if (search) {
        params.append('search', search);
      }

      if (category && category !== 'Category' && category !== 'All Categories') {
        params.append('category', category);
      }

      if (status && status !== 'Status' && status !== 'All Status') {
        params.append('status', status);
      }

      const response = await fetch(`${API_BASE_URL}/api/support-tickets/by-type/${userType}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${userType} tickets`);
      }

      const data = await response.json();
      
      if (data.success) {
        setTicketsData(data.data.tickets);
        setTotalItems(data.data.pagination.total);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (error: any) {
      setError(error.message);
      console.error(`Error fetching ${userType} tickets:`, error);
    } finally {
      setLoading(false);
    }
  }, [userType, itemsPerPage]);

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    fetchTickets(newPage);
  }, [fetchTickets]);

  // Initial data fetch
  useEffect(() => {
    fetchTicketCounts();
    fetchTickets();
  }, [fetchTickets]);

  const handleStatusUpdate = useCallback(async (ticketId: string, newStatus: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/support-tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update ticket status');
      }

      const data = await response.json();
      if (data.success) {
        // Refresh the tickets data to show updated status
        fetchTickets(currentPage);
        // You can also show a success message here
        console.log('Ticket status updated successfully');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      // You can show an error message here
    } finally {
      setLoading(false);
    }
  }, [currentPage, fetchTickets]);

  // Handle search
  const handleSearch = (search: string) => {
    setSearchQuery(search);
    setCurrentPage(1);
    fetchTickets(1, search, categoryFilter, statusFilter);
  };

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1);
    fetchTickets(1, searchQuery, category, statusFilter);
  };
  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchTickets(1, searchQuery, categoryFilter, status);
  };

  const handleMessageHover = useCallback((event: React.MouseEvent<HTMLElement>, message: string) => {
    const target = event.currentTarget;
    const isTextOverflowing = target.scrollWidth > target.clientWidth;
    
    if (isTextOverflowing) {
      setTooltipTarget(target);
      setTooltipMessage(message);
      setShowTooltip(true);
    }
  }, []);

  const handleMessageLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Columns for GenericTable
const columns: Column<SupportTicketsItem>[] = [
   
  {
    label: "Ticket ID",
    key: "ticketId",
    render: (item: SupportTicketsItem) => (

        <p className="name">{item.ticketId}</p>
    ),
  },

  {
  label: "Email",
  key: "emailAddress",
  render: (item: SupportTicketsItem) => <Link href={`mailto:${item.emailAddress}`}><span>{item.emailAddress}</span></Link>,
},
{
  label: "Category",
  key: "category",
  render: (item: SupportTicketsItem) => <p>{item.category}</p>,
},
{
  label: "Message",
  key: "message",
  render: (item: SupportTicketsItem) => (
    <p 
      className="textellipsis"
      onMouseEnter={(e) => handleMessageHover(e, item.message)}
      onMouseLeave={handleMessageLeave}
    >
      {item.message}
    </p>
  ),
},
  {
    label: "Created On",
    key: "createdAt",
    render: (item: SupportTicketsItem) => (
      <div>
        <p>{formatDate(item.createdAt)}</p>
        <span>{formatTimeAgo(item.createdAt)}</span>
      </div>
    ),
  },
  {
    label: "Actions",
    key: "actions",
    render: (item: SupportTicketsItem) => (
      <div className="action-btn-col">
    {(() => {
      switch (item.status) {
        case "New Ticket":
          return (
            <Button className="ptt-status purple" title="New Ticket">
              New Ticket
            </Button>
          );
        case "In Progress":
          return (
            <Button className="ptt-status blue" title="In Progress">
              In Progress
            </Button>
          );
        case "Waiting":
          return (
            <Button className="ptt-status orange" title="Waiting">
              Waiting
            </Button>
          );
        case "Escalated":
          return (
            <Button className="ptt-status red" title="Escalated">
              Escalated
            </Button>
          );
        case "Reopened":
          return (
            <Button className="ptt-status grey" title="Reopened">
              Reopened
            </Button>
          );
        case "Closed":
          return (
            <Button className="ptt-status green" title="Closed">
              Closed
            </Button>
          );
        default:
          return (
            <Button
              className="ptt-status purple"
              title="New Ticket"
              //onClick={() => console.log("View", item)}
            >
              New Ticket
            </Button>
          );
      }
    })()}
  </div>
  
    ),
  },
  
  {
  label: "",
  key: "actionsDropdown",
  render: (item: SupportTicketsItem) => (
    <div className="action-dropdown">
      <Dropdown align="end">
        <Dropdown.Toggle as="span" className="custom-toggle">
          <BsThreeDotsVertical className="menu-icon" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {statusOptions.map((statusOption) => (
            <Dropdown.Item
              key={statusOption.value}
              onClick={() => handleStatusUpdate(item._id, statusOption.value)}
             >
              {statusOption.label}
            </Dropdown.Item>
          ))}
          {/* <Dropdown.Item onClick={() => console.log("New Ticket", item)}>New Ticket</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("In Progress", item)}>In Progress</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Waiting", item)}>Waiting</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Escalated", item)}>Escalated</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Reopened", item)}>Reopened</Dropdown.Item>
          <Dropdown.Item onClick={() => console.log("Closed", item)}>Closed</Dropdown.Item> */}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  ),
}


];

  return (
    <>

<div className="StatementsTopBar">
          <div className="RightTopTbl">
              <Form className="Tblserchdiv"  >
                  <input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  />
                  <Button type="submit"><LuSearch size={20} /></Button>
              </Form>
              {/* <div className="StatusSlect">
                  <Dropdown onSelect={(eventKey) => setUserTypeFilter(eventKey || 'User Type')}>
                  <Dropdown.Toggle id="status-dropdown" >
                      {userTypeFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {userTypeOptions.map((opt) => (
                      <Dropdown.Item eventKey={opt} key={opt} active={userTypeFilter === opt}>
                        {opt}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                  </Dropdown>
              </div> */}
              
              <div className="StatusSlect">
                  <Dropdown onSelect={(eventKey) => handleCategoryFilter(eventKey || 'Category')}>
                  <Dropdown.Toggle id="status-dropdown" >
                      {categoryFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {categoryOptions.map((opt) => (
                      <Dropdown.Item eventKey={opt} key={opt} active={categoryFilter === opt}>
                        {opt}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                  </Dropdown>
              </div>
              <div className="StatusSlect">
                  <Dropdown onSelect={(eventKey) => handleStatusFilter(eventKey || 'Status')}>
                  <Dropdown.Toggle id="status-dropdown" >
                      {statusFilter}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                  {statusOptionsFilter.map((opt) => (
                    <Dropdown.Item eventKey={opt} key={opt} active={statusFilter === opt}>
                      {opt}
                    </Dropdown.Item>
                  ))}
                  </Dropdown.Menu>
                  </Dropdown>
              </div>
          </div>
          
        </div>
        <div className="table-wrapper">
            <GenericTable data={ticketsData} columns={columns as any} bordered={false}/>
            <GenericTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
        </div>
        {/* Tooltip */}
      <Overlay
        target={tooltipTarget}
        show={showTooltip}
        placement="top"
      >
        <Tooltip id="message-tooltip">
          {tooltipMessage}
        </Tooltip>
      </Overlay>
      
    </>
  )
}

export default SupportTicketsTable

"use client";
import React, { useState, useEffect } from 'react'
import "./SupportTicketsTable.css"
import { Button, Dropdown } from 'react-bootstrap'
import { FaEye, FaChevronLeft, FaChevronRight, FaEllipsisV } from 'react-icons/fa';
import { FiSearch } from 'react-icons/fi';
import { LuMessageSquareReply } from 'react-icons/lu';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
import supportTicketService, { DashboardStats } from '@/app/services/supportTicketService'

type SupportTicketsItem = {
  _id: string;
  ticketId: string;
  emailAddress: string;
  category: string;
  message: string;
  date: string;
  time: string;
  status: string;
  createdAt: string;
  fullName: string;
  createdBy: string;
};
type TicketCounts = {
  professionals: number;
  petParents: number;
};


 
  
 
  
  
  

interface SupportTicketsTableProps {
  userType?: 'professionals' | 'petparents';
}

function SupportTicketsTablebackup({ userType = 'professionals' }: SupportTicketsTableProps) {
  const [ticketsData, setTicketsData] = useState<SupportTicketsItem[]>([]);
  const [ticketCounts, setTicketCounts] = useState<TicketCounts>({ professionals: 0, petParents: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('User Type');
  const [categoryFilter, setCategoryFilter] = useState('Category');
  const [statusFilter, setStatusFilter] = useState('Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Status options for the dropdown
  const statusOptions = [
    { value: 'New Ticket', label: 'New Ticket', color: '#E6E6FA' },
    { value: 'In Progress', label: 'In Progress', color: '#ADD8E6' },
    { value: 'Waiting', label: 'Waiting', color: '#FFB347' },
    { value: 'Escalated', label: 'Escalated', color: '#FFB6C1' },
    { value: 'Reopened', label: 'Reopened', color: '#D3D3D3' },
    { value: 'Closed', label: 'Closed', color: '#90EE90' }
  ];

  

  // Get the appropriate data based on userType
 

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
  const fetchTickets = async (page: number = 1, search: string = '', category: string = '', status: string = '') => {
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
  };

  // Initial data fetch
  useEffect(() => {
    fetchTicketCounts();
    fetchTickets();
  }, [userType]);

  
  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    setUpdatingStatus(ticketId);
    try {
      // Call the API to update status
      const response = await supportTicketService.updateTicketStatus(ticketId, newStatus);
      
      if (response.success) {
        // Update the local state
        setTicketsData(prevData => 
          prevData.map(ticket => 
            ticket._id === ticketId 
              ? { ...ticket, status: newStatus }
              : ticket
          )
        );
        
        // Show success message (you can add a toast notification here)
        console.log('Status updated successfully');
      } else {
        console.error('Failed to update status:', response.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };
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

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTickets(newPage, searchQuery, categoryFilter, statusFilter);
  };
   // Format date
   const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };
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

  // Calculate pagination info
  const startItem = totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (error) {
    return (
      <div className="support-tickets-table-container">
        <div className="error-message">
          <p>Error: {error}</p>
          <Button onClick={() => fetchTickets(currentPage, searchQuery, categoryFilter, statusFilter)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Closed":
        return <span className="status-badge closed">Closed</span>;
      case "In Progress":
        return <span className="status-badge in-progress">In Progress</span>;
      case "Escalated":
        return <span className="status-badge escalated">Escalated</span>;
      case "Waiting":
        return <span className="status-badge waiting">Waiting</span>;
      case "Reopened":
        return <span className="status-badge reopened">Reopened</span>;
      default:
        return <span className="status-badge new-ticket">New Ticket</span>;
    }
  };

  return (
    <div className="support-tickets-table-container">
      {/* Search and Filter Bar */}
      <div className="TableBlankSelect">
        <div className="lftSpace"></div>
        <div className="RightSpace">
          <div className="srch">
            <input 
              type="search" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <FiSearch />
          </div>
          {/* <div className="SpaceDropdown">
            <Dropdown onSelect={(eventKey) => setUserTypeFilter(eventKey || 'User Type')}>
              <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-user-type">
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
          <div className="SpaceDropdown">
          <Dropdown onSelect={(eventKey) => handleCategoryFilter(eventKey || 'Category')}>
              <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-category">
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
          <div className="SpaceDropdown">
          <Dropdown onSelect={(eventKey) => handleStatusFilter(eventKey || 'Status')}>
              <Dropdown.Toggle className="custom-status-dropdown" id="dropdown-status-filter">
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

      {/* Support Tickets Table */}
      
        <div className="table-wrapper">
          <table className="support-tickets-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Email</th>
                <th>Category</th>
                <th>Message</th>
                <th>Created On</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            {!loading && (
            <tbody>
              {ticketsData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    No tickets found
                  </td>
                </tr>
              ) : (
                ticketsData.map((item, index) => (
                  <tr key={item._id}>
                    <td className="ticket-id-cell">
                      <span className="ticket-id">{item.ticketId}</span>
                    </td>
                    <td className="user-id-cell">
                      <span className="user-id">{item.emailAddress}</span>
                    </td>
                    <td className="category-cell">
                      <span className="category">{item.category}</span>
                    </td>
                    <td className="message-cell">
                      <span className="message">{item.message}</span>
                    </td>
                    <td className="created-on-cell">
                      <div className="created-on">
                        <span className="date">{formatDate(item.createdAt)}</span>
                        <span className="time">{formatTimeAgo(item.createdAt)}</span>
                      </div>
                    </td>
                    <td className="status-cell">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="actions-cell">
                    <Dropdown>
                        <Dropdown.Toggle 
                          variant="link" 
                          className="action-btn"
                          disabled={updatingStatus === item._id}
                        >
                          {updatingStatus === item._id ? (
                            <div className="spinner-border spinner-border-sm" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          ) : (
                            <FaEllipsisV />
                          )}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="status-update-dropdown">
                          <Dropdown.Header>
                            <div className="status-update-header">
                              <div className="status-icon"></div>
                              <span>Update Status</span>
                            </div>
                          </Dropdown.Header>
                          {statusOptions.map((statusOption) => (
                            <Dropdown.Item
                              key={statusOption.value}
                              onClick={() => handleStatusUpdate(item._id, statusOption.value)}
                              className={`status-option ${item.status === statusOption.value ? 'active' : ''}`}
                              style={{ backgroundColor: statusOption.color }}
                            >
                              {statusOption.label}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            )}
         
          </table>
             {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading tickets...</p>
            </div>
          )}
        </div>
      

      {/* Pagination */}
      {!loading && totalItems > 0 && (
        
        <div className="pagination-container">
          <button 
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FaChevronLeft />
          </button>
          <span className="pagination-info">Showing {startItem} of {totalItems}</span>
         
          <button 
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  )
}

export default SupportTicketsTablebackup
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Button, Form, Badge, Dropdown } from 'react-bootstrap';
import { FaSearch, FaPlus, FaEye, FaEdit,FaTrash, FaCopy, FaEllipsisV, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import "./AssesmentsListTable.css";
import DeleteConfirmationModal from '@/app/Components/DeleteConfirmationModal/DeleteConfirmationModal';

interface Assessment {
  _id: string;
  name: string;
  type: string;
  category: string;
  questions?: Array<{
    question: string;
    description: string;
    imageOptions: Array<{
      image?: string;
      description: string;
      score: number;
    }>;
  }>;
  isPublished: boolean;
  isDraft: boolean;
  isSchedule: {
    type: string;
    date: string;
  };
  createdAt: string;
  updatedAt: string;
  status?: 'published' | 'unpublished' | 'scheduled' | 'work-in-progress' | 'pending';
  scheduledDate?: string;
}

interface AssesmentsListTableProps {
  activeTab?: 'published' | 'unpublished';
}

const AssesmentsListTable: React.FC<AssesmentsListTableProps> = ({ activeTab = 'published' }) => {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  const categories = ['all', 'dog', 'cat', 'horse'];
  const statuses = ['all','scheduled', 'work-in-progress', 'pending'];
  const limit = 10;

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assessment/list`,
        {
          params: {
            page: currentPage,
            limit: limit,
            status: activeTab,
            search: searchTerm,
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
            _t: Date.now()
          },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (response.data.success) {
        // Ensure we're setting an array
        const assessmentsData = response.data.data?.assessments || response.data.data || [];
        console.log("assessmentsData", assessmentsData);
        setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
        setTotalItems(response.data.data?.totalItems || response.data.pagination?.totalItems || 0);
      } else {
        setAssessments([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
      setAssessments([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, categoryFilter, statusFilter, currentPage]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (assessment: Assessment) => {
    if (assessment.isPublished) {
      return <Badge className="status-badge published">Published</Badge>;
    } else if (assessment.isSchedule.type === 'scheduled' && assessment.isSchedule.date) {
      return (
        <div className="status-scheduled">
          <span className="status-dot scheduled"></span>
          <span className="status-text">Scheduled</span>
          <span className="status-text">{formatDate(assessment.isSchedule.date)}</span>
        </div>
      );
    } else if (assessment.isDraft === true) {
      return (
        <div className="status-wip">
          <span className="status-dot wip"></span>
          <span className="status-text">Work in Progress</span>
        </div>
      );
    } else if (assessment.isSchedule.type === 'pending') {
      return (
        <div className="status-pending">
          <span className="status-dot pending"></span>
          <span className="status-text">Pending</span>
        </div>
      );
    } else {
      return <Badge className="status-badge unpublished">Unpublished</Badge>;
    }
  };

  const getQuestionCount = (assessment: Assessment) => {
    return assessment.questions?.length || 0;
  };

  const handleViewAssessment = (id: string) => {
    router.push(`/assessments/${id}`);
  };

  const handleEditAssessment = (id: string) => {
    router.push(`/assessments/edit/${id}`);
  };

  const handleDuplicateAssessment = (id: string) => {
    router.push(`/assessments/duplicate/${id}`);
  };

  const handleDeleteAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedAssessment) return;
    
    try {
      setDeleteLoading(true);
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assessment/${selectedAssessment._id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setShowDeleteModal(false);
        setSelectedAssessment(null);
        fetchAssessments(); // Refresh the list
        alert('Assessment deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('Error deleting assessment. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const totalPages = Math.ceil(totalItems / limit);
  const startItem = ((currentPage - 1) * limit) + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  // Ensure assessments is always an array
  const assessmentsArray = Array.isArray(assessments) ? assessments : [];

  return (
    <div className="assessments-list-container">
      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search Name, Category, assessment type"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <div className="filter-section">
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="all">All Category</option>
            {categories.filter(cat => cat !== 'all').map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          {/* <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-dropdown"
          >
            <option value="all">All Status</option>
            {statuses.filter(status => status !== 'all').map(status => (
              <option key={status} value={status}>
                {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select> */}
        </div>
      </div>

      {/* Assessments Table */}
      <div className="assessments-table-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : assessmentsArray.length === 0 ? (
          <div className="no-data-container">
            <p>No assessments found</p>
          </div>
        ) : (
          <table className="assessments-table">
            <thead>
              <tr>
                <th>Assessment Name</th>
                <th>Assessment Type</th>
                <th>Animal Category</th>
                <th>Number of Questions</th>
                <th>Publish Status & Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assessmentsArray.map((assessment) => (
                <tr key={assessment._id}>
                  <td className="assessment-name-cell">
                    <div className="assessment-name">
                      <span className="name">{assessment.name || 'Untitled Assessment'}</span>
                    </div>
                  </td>
                  <td className="assessment-type">
                    {assessment.type ? assessment.type.replace(/([A-Z])/g, ' $1').trim() : 'N/A'}
                  </td>
                  <td className="animal-category">
                    {assessment.category ? 
                      assessment.category.charAt(0).toUpperCase() + assessment.category.slice(1) : 
                      'N/A'
                    }
                  </td>
                  <td className="questions-count">
                    {getQuestionCount(assessment)} Questions
                  </td>
                  <td className="publish-status">
                    {getStatusBadge(assessment)}
                  </td>
                  <td className="actions">
                    <div className="action-buttons">
                      <button 
                        className="action-btn view-btn"
                        onClick={() => handleViewAssessment(assessment._id)}
                        title="View"
                      >
                        <FaEye />
                      </button>
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEditAssessment(assessment._id)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="action-btn duplicate-btn"
                        onClick={() => handleDuplicateAssessment(assessment._id)}
                        title="Duplicate"
                      >
                        <FaCopy />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteAssessment(assessment)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && assessmentsArray.length > 0 && (
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
      <DeleteConfirmationModal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setSelectedAssessment(null);
        }}
        onConfirm={confirmDelete}
        itemName={selectedAssessment?.name || ''}
        itemType="Assessment"
        loading={deleteLoading}
      />
    </div>
  );
};

export default AssesmentsListTable;
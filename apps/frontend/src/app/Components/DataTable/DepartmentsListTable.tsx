"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Button, Form, Badge, Dropdown } from 'react-bootstrap';
import { FaSearch, FaPlus, FaEye, FaEdit, FaTrash, FaEllipsisV, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import "./DepartmentsListTable.css";
import DeleteConfirmationModal from '@/app/Components/DeleteConfirmationModal/DeleteConfirmationModal';

interface Service {
  _id: string;
  serviceName: string;
  isActive: number;
}

interface Department {
  _id: string;
  name: string;
  status: number;
  services: Service[];
  createdAt?: string;
  updatedAt?: string;
}

interface DepartmentsListTableProps {
  activeTab?: 'active' | 'inactive';
  showCreateButton?: boolean; // 👈 new parameter
  createButtonText?: string; // �� custom button text
  onCreateClick?: () => void; // 👈 create button click handler
}

const DepartmentsListTable: React.FC<DepartmentsListTableProps> = ({ 
    activeTab = 'active',
    showCreateButton = false,
    createButtonText = "Create New",
    onCreateClick, 
}) => {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const limit = 10;

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/content/department/getDepartments`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (response.data.success) {
        const departmentsData = response.data.data || [];
        console.log("departmentsData", departmentsData);
        
        // Filter by status (1 = active, 0 = inactive)
        const filteredDepartments = departmentsData.filter((dept: Department) => {
          if (activeTab === 'active') {
            return dept.status === 1;
          } else {
            return dept.status === 0;
          }
        });

        // Apply search filter
        const searchFiltered = searchTerm 
          ? filteredDepartments.filter((dept: Department) => 
              dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              dept.services.some(service => 
                service.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
              )
            )
          : filteredDepartments;

        setDepartments(Array.isArray(searchFiltered) ? searchFiltered : []);
        setTotalItems(searchFiltered.length);
      } else {
        setDepartments([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

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

  const getStatusBadge = (department: Department) => {
    if (department.status === 1) {
      return <Badge className="status-badge active">Active</Badge>;
    } else {
      return <Badge className="status-badge inactive">Inactive</Badge>;
    }
  };

  const getServicesList = (department: Department) => {
    return department.services
      .filter(service => service.isActive === 1)
      .map(service => service.serviceName)
      .join(', ');
  };

  const handleViewDepartment = (id: string) => {
    // Navigate to department details page
    router.push(`/departments/${id}`);
  };

  const handleEditDepartment = (id: string) => {
    // Navigate to edit department page
    router.push(`/departments/edit/${id}`);
  };

  const handleDeleteDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDepartment) return;
    
    try {
      setDeleteLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/content/department/deleteDepartment`,
        { id: selectedDepartment._id },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setShowDeleteModal(false);
        setSelectedDepartment(null);
        fetchDepartments(); // Refresh the list
        alert('Department deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Error deleting department. Please try again.');
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

  // Ensure departments is always an array
  const departmentsArray = Array.isArray(departments) ? departments : [];

  const handleCreateClick = () => {
    onCreateClick?.();
  };

  return (
    <div className="departments-list-container">
      {/* Search Bar */}
      <div className="search-filter-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search department name or services"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        {showCreateButton && (
            <div className="SelectStatus">
            <Button 
            className="create-new-btn"
            onClick={handleCreateClick}
            variant="dark"
            >
            <FaPlus className="create-icon" />
            {createButtonText}
            </Button>
            </div>
            
        )}
      </div>

      {/* Departments Table */}
      <div className="departments-table-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : departmentsArray.length === 0 ? (
          <div className="no-data-container">
            <p>No departments found</p>
          </div>
        ) : (
          <table className="departments-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Services</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {departmentsArray.map((department) => (
                <tr key={department._id}>
                  <td className="department-name-cell">
                    <div className="department-name">
                      <span className="name">{department.name || 'Untitled Department'}</span>
                    </div>
                  </td>
                  <td className="services-cell">
                    <div className="services-list">
                      {getServicesList(department) || 'No services'}
                    </div>
                  </td>
                  <td className="actions">
                    <div className="action-buttons">
                      <button 
                        className="action-btn view-btn"
                        onClick={() => handleViewDepartment(department._id)}
                        title="View"
                      >
                        <FaEye />
                      </button>
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEditDepartment(department._id)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteDepartment(department)}
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
      {!loading && departmentsArray.length > 0 && (
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
          setSelectedDepartment(null);
        }}
        onConfirm={confirmDelete}
        itemName={selectedDepartment?.name || ''}
        itemType="Department"
        loading={deleteLoading}
      />
    </div>
  );
};

export default DepartmentsListTable; 
"use client";
import React, { useEffect, useState } from "react";
import AdminDashboardLayout from '../AdminDashboard/layout';
import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import { FaCheck, FaTimes, FaArrowLeft } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import RejectModal from '@/app/Components/RejectModal/RejectModal';
import "./BusinessDetails.css";
import { toast } from "react-toastify";
import CustomToast from "@/app/Components/Toasts/CustomToast";

type BusinessDetailsPageProps = {
  businessId: string;
};

// Update the BusinessData type to match your API response
type BusinessData = {
  _id: string;
  cognitoId: string;
  role: string;
  createdAt: string;
  email: string;
  isVerified: number;
  subscribe?: boolean;
  lastLogin?: string;
  updatedAt?: string;
  profileData: {
    _id: string;
    userId: string;
    businessName: string;
    country: string;
    city: string;
    state?: string;
    area?: string;
    postalCode?: string;
    phoneNumber?: string;
    email?: string;
    website?: string;
    businessRegistrationNumber?: string;
    progress?: number;
    selectedServices?: string[]; // Array of service names
    departmentFeatureActive?: string; // "yes" or "no"
    image?: string;
    latitude?: string;
    longitude?: string;
    registrationNumber?: string;
    addressLine1?: string;
    key?: string;
    updatedAt?: string;
    addDepartment?: string[]; // Array of department IDs
    departmentData?: DepartmentData[]; // Array of department objects
  };
};

// Add type for department data
type DepartmentData = {
  _id: string;
  name: string;
  __v?: number;
  services?: ServiceData[];
  status?: number;
  updatedAt?: string;
};

// Add type for service data
type ServiceData = {
  _id: string;
  serviceName: string;
  isActive: number;
};

const BusinessDetailsPage: React.FC<BusinessDetailsPageProps> = ({ businessId }) => {
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchBusinessDetails();
  }, [businessId]);

  const fetchBusinessDetails = async () => {
    try {
      setLoading(true);
      // You'll need to create this API endpoint
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/business/details/${businessId}`
      );
      setBusinessData(response.data.data);
    } catch (error) {
      console.error("Error fetching business details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/business/approve/${businessId}`
      );
      
      toast(
        <CustomToast
          title="Success!"
          message={response?.data?.message}
          type="success"
        />,
        { className: "toast-success" }
      );

      // Wait 3 seconds then go back
      setTimeout(() => {
        router.back();
      }, 3000);

    } catch (error:any) {
      //console.error("Error approving business:", error);
      toast(
        <CustomToast
          title="Error!"
          message={error?.message || "Error approving business"}
          type="error"
        />,
        { className: "toast-error" }
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (message: string, attachments: File[]) => {
    try {
      setActionLoading(true);
      
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('businessId', businessId);
      formData.append('message', message);
      formData.append('businessName', businessData?.profileData?.businessName || '');
      formData.append('businessEmail', businessData?.email || '');
      
      // Append files
      attachments.forEach((file) => {
        formData.append('files', file);
      });

      // Send rejection with email and file uploads
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/business/rejectWithEmail`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Uploaded files:', response.data.uploadedFiles);

      // Update local state
      if (businessData) {
        setBusinessData({
          ...businessData,
          isVerified: -1,
        });
      }

      setShowRejectModal(false);
      
      toast(
        <CustomToast
          title="Success!"
          message={response?.data?.message}
          type="success"
        />,
        { className: "toast-success" }
      );
       // Wait 3 seconds then go back
       setTimeout(() => {
        router.back();
      }, 3000);
    } catch (error:any) {
      console.error("Error rejecting business:", error);
      //alert("Failed to send rejection message. Please try again.");
      toast(
        <CustomToast
          title="Error!"
          message={error?.message || "Failed to send rejection message. Please try again."}
          type="error"
        />,
        { className: "toast-error" }
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeSince = (createdAt: string): string => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diff = now - created;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${minutes} min`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (isVerified: number) => {
    switch (isVerified) {
      case 1:
        return (
          <div className="status-badge verified">
            <FaCheck size={14} /> Verified
          </div>
        );
      case -1:
        return (
          <div className="status-badge rejected">
            <FaTimes size={14} /> Rejected
          </div>
        );
      default:
        return (
          <div className="status-badge pending">
            Pending Verification
          </div>
        );
    }
  };

  // Update the formatDepartmentFeature function to handle boolean properly
  const formatDepartmentFeature = (value: string | boolean | undefined | null): string => {
    if (value === undefined || value === null) {
      return 'No';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'string') {
      if (!value || value.trim() === '') {
        return 'No';
      }
      
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'yes' || lowerValue === 'no') {
        return lowerValue.charAt(0).toUpperCase() + lowerValue.slice(1);
      }
    }
    
    return 'No'; // Default fallback
  };

  // Or create a separate function specifically for boolean fields
  const formatBooleanField = (value: boolean | undefined | null): string => {
    if (value === undefined || value === null) {
      return 'No';
    }
    return value ? 'Yes' : 'No';
  };

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      </AdminDashboardLayout>
    );
  }

  if (!businessData) {
    return (
      <AdminDashboardLayout>
        <div className="text-center py-5">
          <p>Business not found</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <section className="business-details-section">
        <Container fluid>
          <div className="business-details-container">
            {/* Breadcrumbs */}
            <div className="breadcrumbs">
              <span>Home</span> &gt; <span>CRM</span> &gt; <span>Hospitals</span> &gt; <span>{businessData?.profileData?.businessName}</span>
            </div>

            {/* Header */}
            <div className="business-header">
              <div className="business-title-section">
                <h1 className="business-title">{businessData?.profileData?.businessName}</h1>
                {/* <div className="status-badge pending">Pending Verification</div> */}
                {getStatusBadge(businessData?.isVerified || 0)}
                <p className="submission-info">
                  Request Submitted {formatTimeSince(businessData?.createdAt)} ago | {formatDate(businessData?.createdAt)}
                </p>
              </div>
              <div className="action-buttons">
                <Button 
                  variant="dark" 
                  className="approve-btn"
                  onClick={handleApprove}
                  disabled={actionLoading || businessData?.isVerified === 1}
                >
                  <FaCheck /> Approve
                </Button>
                <Button 
                  variant="outline-dark" 
                  className="reject-btn"
                  onClick={handleRejectClick}
                  disabled={actionLoading || businessData?.isVerified === -1}
                >
                  <FaTimes /> Reject
                </Button>
              </div>
            </div>

            {/* Business Information Card */}
            <div className="info-card">
              <div className="card-header">
                <div className="business-logo">
                  <div className="logo-placeholder">
                    {businessData.profileData.businessName.charAt(0)}
                  </div>
                  <span className="business-name">{businessData.profileData.businessName}</span>
                </div>
              </div>
              <Row className="info-fields">
                <Col md={6}>
                  <div className="field-group">
                    <label>Country</label>
                    <input type="text" value={businessData.profileData.country || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>Business Registration Number</label>
                    <input type="text" value={businessData.profileData.registrationNumber || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>Business Name</label>
                    <input type="text" value={businessData.profileData.businessName} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>Phone Number</label>
                    <input type="text" value={businessData.profileData.phoneNumber || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>Email Address</label>
                    <input type="text" value={businessData.profileData.email || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>Website</label>
                    <input type="text" value={businessData.profileData.website || "N/A"} readOnly />
                  </div>
                </Col>
              </Row>
            </div>

            {/* Address Information Card */}
            <div className="info-card">
              <div className="card-header">
                <h3>Address Information</h3>
              </div>
              <Row className="info-fields">
                <Col md={6}>
                  <div className="field-group">
                    <label>Postal Code</label>
                    <input type="text" value={businessData.profileData.postalCode || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>Area</label>
                    <input type="text" value={businessData.profileData.area || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>City</label>
                    <input type="text" value={businessData.profileData.city || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="field-group">
                    <label>State</label>
                    <input type="text" value={businessData.profileData.state || "N/A"} readOnly />
                  </div>
                </Col>
                <Col md={12}>
                  <div className="field-group">
                    <label>Address Line 1</label>
                    <input type="text" value={businessData.profileData.addressLine1 || "N/A"} readOnly />
                  </div>
                </Col>
              </Row>
            </div>

            {/* Services & Departments Card */}
            <div className="info-card">
              <div className="card-header">
                <h3>Services & Departments</h3>
              </div>
              <div className="departments-question">
                <span>Does the business have specialised departments?</span>
                <Button variant="outline-primary" size="sm" className="yes-btn">
                  {formatDepartmentFeature(businessData.profileData.departmentFeatureActive)}
                </Button>
              </div>
              
              <div className="services-section">
                <h4>Selected Services</h4>
                <ul className="services-list">
                  {businessData.profileData.selectedServices?.map((service, index) => (
                    <li key={index}>{service}</li>
                  )) || [
                    "No services selected"
                  ].map((service, index) => (
                    <li key={index}>{service}</li>
                  ))}
                </ul>
              </div>

              <div className="departments-section">
                <h4>Departments</h4>
                {businessData.profileData.departmentData && businessData.profileData.departmentData.length > 0 ? (
                  <ul className="departments-detail">
                    {businessData.profileData.departmentData.map((department, index) => (
                      <li key={department._id} className="department-item">
                        {department.name}
                        {/* {department.services && department.services.length > 0 && (
                          <ul className="department-services">
                            {department.services.map((service) => (
                              <li key={service._id} className={service.isActive ? 'active' : 'inactive'}>
                                {service.serviceName}
                              </li>
                            ))}
                          </ul>
                        )} */}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ol className="departments-list">
                    {[
                      "General Medicine",
                      "Surgery",
                      "Dentistry",
                      "Dermatology",
                      "Orthopedics",
                      "Radiology & Imaging",
                      "Cardiology",
                      "Ophthalmology",
                      "Emergency & Critical Care",
                      "Rehabilitation & Physiotherapy",
                      "Nutrition & Weight Management",
                      "Oncology",
                      "Internal Medicine",
                      "Behavioral Health",
                      "Exotics & Small Mammals"
                    ].map((department, index) => (
                      <li key={index}>{department}</li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Reject Modal */}
      <RejectModal
        show={showRejectModal}
        onHide={() => setShowRejectModal(false)}
        businessName={businessData?.profileData?.businessName || ''}
        onReject={handleRejectSubmit}
        loading={actionLoading}
      />
    </AdminDashboardLayout>
  );
};

export default BusinessDetailsPage; 
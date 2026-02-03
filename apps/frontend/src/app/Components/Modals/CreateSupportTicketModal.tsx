"use client";
import React, { useState } from "react";
import { Modal, Button, Form, Dropdown } from 'react-bootstrap';
import { IoAddCircle } from 'react-icons/io5';
import { FiPaperclip } from 'react-icons/fi';
import supportTicketService from '@/app/services/supportTicketService';
import "./CreateSupportTicketModal.css";

interface CreateSupportTicketModalProps {
  show: boolean;
  onHide: () => void;
}

const CreateSupportTicketModal: React.FC<CreateSupportTicketModalProps> = ({ show, onHide }) => {
  const [formData, setFormData] = useState({
    category: '',
    platform: '',
    fullName: '',
    emailAddress: '',
    userType: '',
    userStatus: '',
    createdBy: 'Admin',
    message: '',
    attachments: [] as File[]
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownStates, setDropdownStates] = useState({
    category: false,
    platform: false,
    userType: false,
    userStatus: false
  });

  // Dropdown options
  const categoryOptions = ['General', 'Technical', 'Billing', 'DSAR', 'Feature Request'];
  const platformOptions = ['Email', 'Discord', 'Phone', 'Web Form'];
  const userTypeOptions = ['Registered', 'Not Registered', 'Guest'];
  const userStatusOptions = ['Active', 'Inactive', 'Pending', 'Suspended'];

  
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!formData.emailAddress) {
      newErrors.emailAddress = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
      newErrors.emailAddress = 'Please enter a valid email address';
    }

    if (!formData.userType) {
      newErrors.userType = 'User type is required';
    }

    if (!formData.userStatus) {
      newErrors.userStatus = 'User status is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Validate file types and sizes
    const validFiles = files.filter(file => {
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
  
        if (!validTypes.includes(file.type)) {
          alert(`Invalid file type: ${file.name}. Allowed types: images, PDF, text, Word, Excel`);
          return false;
        }
  
        if (file.size > 10 * 1024 * 1024) { // 10MB
          alert(`File too large: ${file.name}. Maximum size is 10MB`);
          return false;
        }
  
        return true;
      });
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...validFiles]
      }));
  };
  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await supportTicketService.createTicket(formData);

      if (response.success) {
        // Reset form
        setFormData({
          category: '',
          platform: '',
          fullName: '',
          emailAddress: '',
          userType: '',
          userStatus: '',
          message: '',
          createdBy: 'Admin',
          attachments: []
        });
        setErrors({});
        
        // Show success message
        alert('Support ticket created successfully!');
        
        // Close modal and trigger success callback
        onHide();
        //onSuccess?.();
      } else {
        // Handle validation errors from server
        if (response.errors) {
          const serverErrors: {[key: string]: string} = {};
          response.errors.forEach(error => {
            serverErrors[error.field] = error.message;
          });
          setErrors(serverErrors);
        } else {
          alert(response.message || 'Failed to create ticket');
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDropdown = (dropdownName: string) => {
    setDropdownStates(prev => ({
      ...prev,
      [dropdownName]: !prev[dropdownName as keyof typeof prev]
    }));
  };

  return (
    <Modal show={show} onHide={onHide} centered className="create-support-ticket-modal">
      <Modal.Header closeButton>
        <Modal.Title>Create New Ticket</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Ticket Information Section */}
          <div className="form-section">
            <h6 className="section-title">Ticket Information</h6>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <Dropdown onToggle={() => toggleDropdown('category')}>
                  <Dropdown.Toggle className="custom-dropdown">
                    {formData.category || 'Category'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {categoryOptions.map((option) => (
                      <Dropdown.Item 
                        key={option} 
                        onClick={() => handleInputChange('category', option)}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
                {errors.category && <span className="error-message">{errors.category}</span>}
              </div>
              <div className="form-group">
                <label>Platform</label>
                <Dropdown onToggle={() => toggleDropdown('platform')}>
                  <Dropdown.Toggle className="custom-dropdown">
                    {formData.platform || 'Platform'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {platformOptions.map((option) => (
                      <Dropdown.Item 
                        key={option} 
                        onClick={() => handleInputChange('platform', option)}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
                {errors.platform && <span className="error-message">{errors.platform}</span>}
              </div>
            </div>
          </div>

          {/* User Information Section */}
          <div className="form-section">
            <h6 className="section-title">User Information</h6>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="form-input"
                />
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.emailAddress}
                  onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                  className="form-input"
                />
                {errors.emailAddress && <span className="error-message">{errors.emailAddress}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>User Type</label>
                <Dropdown onToggle={() => toggleDropdown('userType')}>
                  <Dropdown.Toggle className="custom-dropdown">
                    {formData.userType || 'User Type'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {userTypeOptions.map((option) => (
                      <Dropdown.Item 
                        key={option} 
                        onClick={() => handleInputChange('userType', option)}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
                {errors.userType && <span className="error-message">{errors.userType}</span>}
              </div>
              <div className="form-group">
                <label>User Status</label>
                <Dropdown onToggle={() => toggleDropdown('userStatus')}>
                  <Dropdown.Toggle className="custom-dropdown">
                    {formData.userStatus || 'User Status'}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {userStatusOptions.map((option) => (
                      <Dropdown.Item 
                        key={option} 
                        onClick={() => handleInputChange('userStatus', option)}
                      >
                        {option}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
                {errors.userStatus && <span className="error-message">{errors.userStatus}</span>}
              </div>
            </div>
          </div>

          {/* Message Section */}
          <div className="form-section">
            <h6 className="section-title">Message / Issue Description</h6>
            <div className="form-group">
              <textarea
                placeholder="Add description"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className="form-textarea"
                rows={4}
              />
              {errors.message && <span className="error-message">{errors.message}</span>}
            </div>
            {/* <div className="file-upload">
              <input
                type="file"
                id="file-upload"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="file-upload-label">
                <FiPaperclip />
                Attach files
              </label>
              {formData.attachments.length > 0 && (
                <div className="attached-files">
                  {formData.attachments.map((file, index) => (
                    <span key={index} className="attached-file">
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
            </div> */}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <Button variant="outline-secondary" onClick={onHide} className="cancel-btn" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="create-btn" disabled={isSubmitting}>
            {isSubmitting ? (
                'Creating...'
              ) : (
                <>
                  <IoAddCircle size={16} />
                  Create New Ticket
                </>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default CreateSupportTicketModal;
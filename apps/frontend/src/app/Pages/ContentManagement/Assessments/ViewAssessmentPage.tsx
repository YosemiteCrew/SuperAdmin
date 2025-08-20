"use client";
import React, { useState, useEffect } from "react";
import AdminDashboardLayout from '../../AdminDashboard/layout';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { FaArrowLeft, FaEdit, FaCopy, FaTrash, FaEye, FaGlobe, FaEyeSlash } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import "./ViewAssessmentPage.css";

interface ImageOption {
  image?: string;
  description: string;
  score: number;
}

interface Question {
  question: string;
  description: string;
  imageOptions: ImageOption[];
}

interface PainScoreOption {
  id: number;
  title: string;
  description: string;
  colorCode: string;
  selectedNumbers: number[];
}

interface Assessment {
  _id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  questions: Question[];
  painScores: PainScoreOption[]; 
  isPublished: boolean;
  isDraft: boolean;
  isSchedule: {
    type: string;
    date: string;
  };
  createdAt: string;
  updatedAt: string;
  status?: string;
  scheduledPublishDate?: string;
}

interface ViewAssessmentPageProps {
  assessmentId: string;
}

const ViewAssessmentPage: React.FC<ViewAssessmentPageProps> = ({ assessmentId }) => {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assessment/${assessmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setAssessment(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
      alert('Error loading assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/assessments/edit/${assessmentId}`);
  };

  const handleDuplicate = () => {
    router.push(`/assessments/duplicate/${assessmentId}`);
  };

  const handleDelete = () => {
    router.push(`/assessments/${assessmentId}?action=delete`);
  };
  const handlePublish = async () => {
    if (!assessment) return;
    
    try {
      setPublishing(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assessment/${assessmentId}/publish`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert('Assessment published successfully!');
        // Refresh the assessment data to update the status
        await fetchAssessment();
      }
    } catch (error) {
      console.error('Error publishing assessment:', error);
      alert('Error publishing assessment. Please try again.');
    } finally {
      setPublishing(false);
    }
  };
  const handleUnpublish = async () => {
    if (!assessment) return;
    
    try {
      setUnpublishing(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assessment/${assessmentId}/unpublish`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert('Assessment unpublished successfully!');
        // Refresh the assessment data to update the status
        await fetchAssessment();
      }
    } catch (error) {
      console.error('Error unpublishing assessment:', error);
      alert('Error unpublishing assessment. Please try again.');
    } finally {
      setUnpublishing(false);
    }
  };

  const handleBack = () => {
    router.push('/assessments');
  };

  // Check if assessment is a draft (not published and not scheduled)
  const isDraft = assessment && !assessment.isPublished && assessment.isDraft;
  const isPublished = assessment && assessment.isPublished;

  // mapping statuses to color + label
const statusMap: Record<string, { color: string; label: string }> = {
  published: { color: "success", label: "Published" },
  draft: { color: "warning", label: "Draft" },
  unpublished: { color: "secondary", label: "Unpublished" },
  archived: { color: "dark", label: "Archived" },
  pending: { color: "info", label: "Pending" },
};

// pick status key based on your data
const statusKey = assessment?.isPublished
  ? "published"
  : assessment?.isDraft
  ? "draft"
  : assessment?.isSchedule?.type === 'scheduled'
  ? "pending"
  : "unpublished";

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AdminDashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <AdminDashboardLayout>
        <div className="text-center py-5">
          <p>Assessment not found</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="view-assessment-container">
        <Container>
          {/* Header */}
          <div className="assessment-header">
            <Button 
              variant="link" 
              onClick={handleBack}
              className="back-button"
            >
              <FaArrowLeft /> Back to Assessments
            </Button>
            
            <div className="header-actions">
              <Button variant="outline-primary" onClick={handleEdit}>
                <FaEdit /> Edit
              </Button>
              <Button variant="outline-secondary" onClick={handleDuplicate}>
                <FaCopy /> Duplicate
              </Button>
              {/* Show Publish button only for draft assessments */}
              {isDraft || !isPublished && (
                <Button 
                  variant="success" 
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  <FaGlobe /> {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              )}
              {/* Show Unpublish button only for published assessments */}
              {isPublished && (
                <Button 
                  variant="warning" 
                  onClick={handleUnpublish}
                  disabled={unpublishing}
                >
                  <FaEyeSlash /> {unpublishing ? 'Unpublishing...' : 'Unpublish'}
                </Button>
              )}
              
              <Button variant="outline-danger" onClick={handleDelete}>
                <FaTrash /> Delete
              </Button>
            </div>
          </div>

          {/* Assessment Info */}
          <div className="assessment-info">
            <h1 className="assessment-title">{assessment.name}</h1>
            <div className="assessment-meta">
            <Badge bg={statusMap[statusKey].color}>
              {statusMap[statusKey].label}
            </Badge>
              <span className="meta-item">Type: {assessment.type}</span>
              <span className="meta-item">Category: {assessment.category}</span>
              <span className="meta-item">
                Created: {new Date(assessment.createdAt).toLocaleDateString()}
              </span>
            </div>
            {assessment.description && (
              <p className="assessment-description">{assessment.description}</p>
            )}
          </div>

          {/* Assessment Preview */}
          <div className="assessment-preview">
            <div className="preview-header">
              <h2>Assessment Preview</h2>
              <span className="step-indicator">Step {currentStep} of {assessment.questions.length}</span>
            </div>

            {/* <div className="preview-instructions">
              <p>Observe the cat awake and undisturbed from a distance for 30 seconds and then score each FGS action unit.</p>
            </div> */}

            {assessment.questions.map((question, index) => (
              <div 
                key={index} 
                className={`question-section ${currentStep === index + 1 ? 'active' : 'hidden'}`}
              >
                <h3 className="question-title">{question.question}</h3>
                {question.description && (
                  <p className="question-description">{question.description}</p>
                )}
                
                <div className="options-grid">
                  {question.imageOptions.map((option, optionIndex) => (
                    <div key={optionIndex} className="option-card">
                      {option.image && (
                        <div className="option-image">
                          <img src={`${process.env.NEXT_PUBLIC_CLOUD_FRONT_URI}/${option.image}`} alt={option.description} />
                        </div>
                      )}
                      <div className="option-label">{option.description}</div>
                      <div className="option-score">Score: {option.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Navigation */}
            <div className="preview-navigation">
              <Button 
                variant="outline-primary"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              <Button 
                variant="primary"
                onClick={() => setCurrentStep(Math.min(assessment.questions.length, currentStep + 1))}
                disabled={currentStep === assessment.questions.length}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Pain Score Preview */}
          {assessment.painScores && assessment.painScores.length > 0 && (
            <div className="assessment-preview mb-4">
              <div className="preview-header">
                <h2>Pain Score</h2>
              </div>
              
              <div className="pain-scores-grid">
                {assessment.painScores.map((painScore, index) => (
                  <div key={index} className="pain-score-card">
                    <div className="pain-score-header">
                      <h4 style={{ color: painScore.colorCode }}>{painScore.title}</h4>
                      {painScore.description && (
                        <p className="pain-score-description">{painScore.description}</p>
                      )}
                    </div>
                    
                    <div className="pain-score-numbers">
                      <span className="numbers-label">Numbers: </span>
                      {painScore.selectedNumbers.map((num, numIndex) => (
                        <span 
                          key={numIndex} 
                          className="number-badge"
                          style={{ 
                            backgroundColor: painScore.colorCode,
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '50%',
                            marginRight: '5px',
                            fontSize: '12px'
                          }}
                        >
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </div>
    </AdminDashboardLayout>
  );
};

export default ViewAssessmentPage; 
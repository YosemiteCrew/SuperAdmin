"use client";
import React, { useState, useEffect } from "react";
import AdminDashboardLayout from '../../AdminDashboard/layout';
import { Container, Dropdown, Row, Col, Button, Form } from 'react-bootstrap';
import { FaPlus, FaCamera, FaTrash, FaMinus, FaArrowLeft, FaSave } from "react-icons/fa";
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';

// Define reusable dropdown options
const ASSESSMENT_TYPES = [
  { value: "questionnaire", label: "Questionnaire" },
  { value: "polarquestion", label: "Polar question" },
];

const CATEGORY_OPTIONS = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "horse", label: "Horse" }
];

interface ImageOption {
  id: number;
  image?: File | string | null;
  description: string;
  score: number | "";
}

interface PainScoreOption {
  id: number;
  title: string;
  description: string;
  colorCode: string;
  selectedNumbers: number[];
}

interface Question {
  id: number;
  question: string;
  description: string;
  imageOptions: ImageOption[];
}

interface Assessment {
  _id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  questions: Question[];
  isPublished: boolean;
}

interface EditAssessmentPageProps {
  assessmentId: string;
}

const EditAssessmentPage: React.FC<EditAssessmentPageProps> = ({ assessmentId }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentType, setAssessmentType] = useState("questionnaire");
  const [category, setCategory] = useState("dog");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{[key: string]: string}>({});
  const [painScores, setPainScores] = useState<PainScoreOption[]>([]);

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
        const assessment = response.data.data;
        setAssessmentName(assessment.name);
        setAssessmentType(assessment.type);
        setCategory(assessment.category);
        setDescription(assessment.description);
        
        // Convert questions to the format expected by the form
        const formattedQuestions = assessment.questions.map((q: any, index: number) => ({
          id: Date.now() + index,
          question: q.question,
          description: q.description,
          imageOptions: q.imageOptions.map((opt: any, optIndex: number) => ({
            id: Date.now() + index * 100 + optIndex,
            image: opt.image,
            description: opt.description,
            score: opt.score
          }))
        }));
        
        setQuestions(formattedQuestions);

        // Set image previews for existing images
        const previews: {[key: string]: string} = {};
        formattedQuestions.forEach((q: any, qIndex: number) => {
          q.imageOptions.forEach((opt: any, optIndex: number) => {
            if (opt.image) {
              const previewKey = `${q.id}-${opt.id}`;
              previews[previewKey] = opt.image;
            }
          });
        });
        setImagePreviews(previews);
        // Convert pain scores to the format expected by the form
        const formattedPainScores = assessment.painScores ? assessment.painScores.map((ps: any, index: number) => ({
          id: Date.now() + index,
          title: ps.title,
          description: ps.description,
          colorCode: ps.colorCode,
          selectedNumbers: ps.selectedNumbers
        })) : [];
        
        setPainScores(formattedPainScores);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
      alert('Error loading assessment');
    } finally {
      setLoading(false);
    }
  };

  

  // Handle question field change
  const handleQuestionChange = (id: number, field: 'question' | 'description', value: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // Handle image option change
  const handleImageOptionChange = (questionId: number, optionId: number, field: 'image' | 'description' | 'score', value: File | string | number | null) => {
    setQuestions((prev) =>
      prev.map((q) => 
        q.id === questionId 
          ? {
              ...q,
              imageOptions: q.imageOptions.map((opt) =>
                opt.id === optionId ? { ...opt, [field]: value } : opt
              )
            }
          : q
      )
    );
  };

  // Handle pain score option change
  const handlePainScoreChange = (id: number, field: 'title' | 'description' | 'colorCode', value: string) => {
    setPainScores((prev) =>
      prev.map((ps) => (ps.id === id ? { ...ps, [field]: value } : ps))
    );
  };

  // Handle pain score number selection
  const handlePainScoreNumberChange = (id: number, numbers: number[]) => {
    setPainScores((prev) =>
      prev.map((ps) => (ps.id === id ? { ...ps, selectedNumbers: numbers } : ps))
    );
  };

  // Add pain score option
  const addPainScore = () => {
    setPainScores((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        description: "",
        colorCode: "",
        selectedNumbers: []
      }
    ]);
  };

  // Remove pain score option
  const removePainScore = (id: number) => {
    setPainScores((prev) => prev.filter((ps) => ps.id !== id));
  };

  // Add image option to question
  const addImageOption = (questionId: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              imageOptions: [...q.imageOptions, { id: Date.now(), image: null, description: "", score: "" }]
            }
          : q
      )
    );
  };

  // Remove image option from question
  const removeImageOption = (questionId: number, optionId: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              imageOptions: q.imageOptions.filter((opt) => opt.id !== optionId)
            }
          : q
      )
    );
  };

  // Add a new question
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { 
        id: Date.now(), 
        question: "", 
        description: "", 
        imageOptions: [
          { id: Date.now(), image: null, description: "", score: "" },
          { id: Date.now() + 1, image: null, description: "", score: "" },
          { id: Date.now() + 2, image: null, description: "", score: "" }
        ]
      },
    ]);
  };

  // Delete a question
  const deleteQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Handle image upload
  const handleImageUpload = async (questionId: number, optionId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        const previewKey = `${questionId}-${optionId}`;
        setImagePreviews(prev => ({ ...prev, [previewKey]: previewUrl }));

        const formData = new FormData();
        formData.append('image', file);

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assessment/upload-image`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (response.data.success) {
          handleImageOptionChange(questionId, optionId, 'image', response.data.data.imageUrl);
          // Update preview with uploaded image URL
          setImagePreviews(prev => ({ ...prev, [previewKey]: response.data.data.imageUrl }));
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image. Please try again.');
        // Remove preview on error
        const previewKey = `${questionId}-${optionId}`;
        setImagePreviews(prev => {
          const newPreviews = { ...prev };
          delete newPreviews[previewKey];
          return newPreviews;
        });
      }
    }
  };

  // Validate form before submission
  const validateForm = () => {
    if (!assessmentName.trim()) {
      alert('Please enter an assessment name');
      return false;
    }

    for (const question of questions) {
      if (!question.question.trim()) {
        alert('Please fill in all questions');
        return false;
      }

      // Validate scores
      for (const option of question.imageOptions) {
        // if (!option.score || option.score <= 0) {
        //   alert('All image options must have a score greater than 0');
        //   return false;
        // }
        if (option.score === undefined || option.score === null || option.score === '') {
          alert('All image options must have a score');
          return false;
        }
      }
    }
    // Validate pain scores
    for (const painScore of painScores) {
      if (!painScore.title.trim()) {
        alert('Please fill in all pain score titles');
        return false;
      }
      if (!painScore.description.trim()) {
        alert('Please fill in all pain score descriptions');
        return false;
      }
      if (!painScore.colorCode.trim()) {
        alert('Please fill in all pain score colors');
        return false;
      }
      if (painScore.selectedNumbers.length === 0) {
        alert('Please select at least one number for each pain score option');
        return false;
      }
    }

    return true;
  };

  // Prepare form data for API
  const prepareFormData = () => {
    return {
      name: assessmentName,
      type: assessmentType,
      category: category,
      description: description,
      questions: questions.map(q => ({
        question: q.question,
        description: q.description,
        imageOptions: q.imageOptions.map(opt => ({
          image: opt.image,
          description: opt.description,
          score: Number(opt.score)
        }))
      })),
      painScores: painScores.map(ps => ({
        title: ps.title,
        description: ps.description,
        colorCode: ps.colorCode,
        selectedNumbers: ps.selectedNumbers
      }))
    };
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setSaving(true);
      const formData = prepareFormData();
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/assessment/${assessmentId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        alert('Assessment updated successfully!');
        router.push('/assessments');
      }
    } catch (error) {
      console.error('Error updating assessment:', error);
      alert('Error updating assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/assessments');
  };
  // Get all selected numbers across all pain score options
  const getAllSelectedNumbers = () => {
    const allNumbers: number[] = [];
    painScores.forEach(ps => {
      allNumbers.push(...ps.selectedNumbers);
    });
    return allNumbers;
  };

  // Check if a number is available for selection
  const isNumberAvailable = (num: number, currentPainScoreId: number) => {
    const allSelectedNumbers = getAllSelectedNumbers();
    const currentPainScore = painScores.find(ps => ps.id === currentPainScoreId);
    const currentSelectedNumbers = currentPainScore?.selectedNumbers || [];
    
    // If this number is already selected by the current pain score, it's available
    if (currentSelectedNumbers.includes(num)) {
      return true;
    }
    
    // If this number is selected by any other pain score, it's not available
    return !allSelectedNumbers.includes(num);
  };

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

  return (
    <AdminDashboardLayout>
      <section style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <Container>
          <div className="py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Button 
                variant="link" 
                onClick={handleBack}
                className="p-0 text-decoration-none"
              >
                <FaArrowLeft /> Back to Assessments
              </Button>
              <h2 style={{ fontWeight: '600', color: '#333', margin: 0 }}>Edit Assessment</h2>
            </div>

            {/* Assessment Name and Dropdowns */}
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="flex-grow-1">
                <Form.Control
                  type="text"
                  placeholder="Enter assessment name"
                  value={assessmentName}
                  onChange={(e) => setAssessmentName(e.target.value)}
                  style={{ 
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '12px 16px'
                  }}
                />
              </div>

              {/* First dropdown */}
              <Dropdown onSelect={(val) => val && setAssessmentType(val)}>
                <Dropdown.Toggle 
                  variant="light" 
                  className="rounded-pill px-3 border"
                  style={{ backgroundColor: 'white', borderColor: '#ddd' }}
                >
                  {ASSESSMENT_TYPES.find(opt => opt.value === assessmentType)?.label}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {ASSESSMENT_TYPES.map(opt => (
                    <Dropdown.Item
                      key={opt.value}
                      eventKey={opt.value}
                      active={assessmentType === opt.value}
                    >
                      {opt.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {/* Second dropdown */}
              <Dropdown onSelect={(val) => val && setCategory(val)}>
                <Dropdown.Toggle 
                  variant="light" 
                  className="rounded-pill px-3 border"
                  style={{ backgroundColor: 'white', borderColor: '#ddd' }}
                >
                  {CATEGORY_OPTIONS.find(opt => opt.value === category)?.label}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {CATEGORY_OPTIONS.map(opt => (
                    <Dropdown.Item
                      key={opt.value}
                      eventKey={opt.value}
                      active={category === opt.value}
                    >
                      {opt.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            {/* Description */}
            {/* <div className="mb-4">
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter assessment description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ 
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '12px 16px'
                }}
              />
            </div> */}

            {/* Questions Container */}
            <div 
              className="p-4 rounded shadow-sm position-relative"
              style={{ backgroundColor: 'white', border: '1px solid #ddd' }}
            >
              {questions.map((q, questionIndex) => (
                <div key={q.id} className="mb-4">
                  {/* Question Header */}
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 style={{ color: '#333', fontWeight: '600' }}>
                      Question {questionIndex + 1}
                    </h6>
                    {/* Delete Question Button */}
                    {questions.length > 1 && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => deleteQuestion(q.id)}
                        style={{ borderRadius: '50%', width: '35px', height: '35px' }}
                      >
                        <FaTrash size={12} />
                      </Button>
                    )}
                  </div>

                  {/* Question and Description Row */}
                  <Row className="mb-4">
                    <Col md={6}>
                      <Form.Control
                        type="text"
                        placeholder="Question"
                        value={q.question}
                        onChange={(e) =>
                          handleQuestionChange(q.id, "question", e.target.value)
                        }
                        style={{ 
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '12px 16px'
                        }}
                      />
                    </Col>
                    <Col md={6}>
                      <Form.Control
                        type="text"
                        placeholder="Description"
                        value={q.description}
                        onChange={(e) =>
                          handleQuestionChange(q.id, "description", e.target.value)
                        }
                        style={{ 
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '12px 16px'
                        }}
                      />
                    </Col>
                  </Row>

                  {/* Image Options Section */}
                  <div className="mb-3">
                    {q.imageOptions.map((imageOption, optionIndex) => (
                      <div key={imageOption.id} className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <span style={{ color: '#666', fontWeight: '500' }}>
                            Option {optionIndex + 1}
                          </span>
                          {/* Remove Image Option Button */}
                          {q.imageOptions.length > 1 && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeImageOption(q.id, imageOption.id)}
                              style={{ borderRadius: '50%', width: '30px', height: '30px' }}
                            >
                              <FaMinus size={10} />
                            </Button>
                          )}
                        </div>

                        {/* Image Upload */}
                        <div className="mb-3">
                          <label 
                            className="d-flex align-items-center gap-3 p-3 border rounded cursor-pointer"
                            style={{ 
                              backgroundColor: 'white',
                              borderStyle: 'dashed',
                              borderColor: '#007bff',
                              cursor: 'pointer'
                            }}
                          >
                            <div 
                              className="d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                borderRadius: '50%'
                              }}
                            >
                              <FaCamera />
                            </div>
                            
                            {/* Show preview if available */}
                            {imagePreviews[`${q.id}-${imageOption.id}`] ? (
                              <div className="image-preview-container">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={`${process.env.NEXT_PUBLIC_CLOUD_FRONT_URI}/${imagePreviews[`${q.id}-${imageOption.id}`]}`} 
                                  alt="Preview" 
                                  className="image-preview"
                                  style={{
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    border: '2px solid #e9ecef'
                                  }}
                                />
                                <span style={{ color: '#28a745', fontSize: '12px' }}>
                                  ✓ Image uploaded
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#666' }}>
                                {typeof imageOption.image === 'string' ? 'Image uploaded' : 
                                 imageOption.image instanceof File ? imageOption.image.name : 
                                 "Add Image here (Optional)"}
                              </span>
                            )}
                            
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={(e) => handleImageUpload(q.id, imageOption.id, e)}
                            />
                          </label>
                        </div>
                        <div className="mb-3">
                          {/* Image Description */}
                        <Form.Control
                          type="text"
                          placeholder="Add description about image"
                          value={imageOption.description}
                          onChange={(e) =>
                            handleImageOptionChange(q.id, imageOption.id, 'description', e.target.value)
                          }
                          style={{ 
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            backgroundColor: 'white'
                          }}
                        />
                        </div>
                        <div className="mb-3">
                        <Form.Control
                          type="number"
                          placeholder="Score"
                          value={imageOption.score}
                          onChange={(e) => {
                            const value = e.target.value;
                            // If empty string, set to empty string, otherwise convert to number
                            const numericValue = value === '' ? '' : Number(value);
                            handleImageOptionChange(q.id, imageOption.id, 'score', numericValue);
                          }}
                        />
                        </div>

                        
                        
                      </div>
                    ))}
                    
                    {/* Add Image Option Button */}
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="d-flex align-items-center gap-2 mt-2"
                      onClick={() => addImageOption(q.id)}
                      style={{ borderRadius: '20px', padding: '6px 12px' }}
                    >
                      <FaPlus size={12} /> Add Image Option
                    </Button>
                  </div>

                  {/* Separator line between questions */}
                  {questionIndex < questions.length - 1 && (
                    <hr style={{ margin: '2rem 0', borderColor: '#eee' }} />
                  )}
                </div>
              ))}

              {/* Add Question Button */}
              <Button
                variant="link"
                className="d-flex align-items-center gap-2 text-primary p-0"
                onClick={addQuestion}
                style={{ 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                <FaPlus /> Add Question
              </Button>
            </div>

            {/* Pain Score Container */}
            <div 
              className="p-4 rounded shadow-sm position-relative mb-4"
              style={{ backgroundColor: 'white', border: '1px solid #ddd' }}
            >
              <h4 className="mb-3" style={{ color: '#333', fontWeight: '600' }}>Pain Score</h4>
              {painScores.map((painScore, index) => (
                <div key={painScore.id} className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span style={{ color: '#666', fontWeight: '500' }}>
                      Pain Score Option {index + 1}
                    </span>
                    {/* Remove Pain Score Button */}
                    {painScores.length > 1 && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removePainScore(painScore.id)}
                        style={{ borderRadius: '50%', width: '30px', height: '30px' }}
                      >
                        <FaMinus size={10} />
                      </Button>
                    )}
                  </div>

                  <Row className="mb-3">
                    <Col md={4}>
                      <Form.Control
                        type="text"
                        placeholder="Title"
                        value={painScore.title}
                        onChange={(e) => handlePainScoreChange(painScore.id, 'title', e.target.value)}
                        style={{ 
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          backgroundColor: 'white'
                        }}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Control
                        type="text"
                        placeholder="Description"
                        value={painScore.description}
                        onChange={(e) => handlePainScoreChange(painScore.id, 'description', e.target.value)}
                        style={{ 
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          backgroundColor: 'white'
                        }}
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Control
                        type="color"
                        value={painScore.colorCode}
                        onChange={(e) => handlePainScoreChange(painScore.id, 'colorCode', e.target.value)}
                        style={{ 
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '5px',
                          backgroundColor: 'white',
                          height: '42px'
                        }}
                      />
                    </Col>
                  </Row>

                  {/* Number Selection */}
                  <div className="mb-3">
                    <label style={{ color: '#666', fontWeight: '500', marginBottom: '10px', display: 'block' }}>
                      Select Numbers (1-10):
                    </label>
                    <div className="d-flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const isSelected = painScore.selectedNumbers.includes(num);
                        const isAvailable = isNumberAvailable(num, painScore.id);
                        
                        return (
                          <Button
                            key={num}
                            variant={isSelected ? "primary" : "outline-secondary"}
                            size="sm"
                            disabled={!isAvailable && !isSelected}
                            onClick={() => {
                              const newNumbers = isSelected
                                ? painScore.selectedNumbers.filter(n => n !== num)
                                : [...painScore.selectedNumbers, num];
                              handlePainScoreNumberChange(painScore.id, newNumbers);
                            }}
                            style={{ 
                              borderRadius: '50%', 
                              width: '35px', 
                              height: '35px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: isAvailable || isSelected ? 1 : 0.5
                            }}
                          >
                            {num}
                          </Button>
                        );
                      })}
                    </div>
                    <small className="text-muted">
                      Selected: {painScore.selectedNumbers.length > 0 ? painScore.selectedNumbers.join(', ') : 'None'}
                    </small>
                    {painScore.selectedNumbers.length === 0 && (
                      <small className="text-danger d-block mt-1">
                        Please select at least one number
                      </small>
                    )}
                  </div>
                </div>
              ))}

              {/* Add Pain Score Button */}
              <Button
                variant="outline-primary"
                size="sm"
                className="d-flex align-items-center gap-2 mt-2"
                onClick={addPainScore}
                style={{ borderRadius: '20px', padding: '6px 12px' }}
              >
                <FaPlus /> Add Pain Score Option
              </Button>
            </div>

            {/* Save Button */}
            <div className="d-flex justify-content-center mt-4">
              <Button
                variant="primary"
                className="px-5 py-2 rounded-pill"
                onClick={handleSave}
                disabled={saving}
                style={{ 
                  fontWeight: '500',
                  backgroundColor: '#007bff'
                }}
              >
                <FaSave className="me-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </AdminDashboardLayout>
  );
};

export default EditAssessmentPage; 
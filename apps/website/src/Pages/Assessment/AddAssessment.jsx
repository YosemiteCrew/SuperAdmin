import React, { useState } from 'react';
import { Button, Col, Container, Form, Modal, Row, Tab, Tabs, Card } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import AdminDashboardLayout from '../AdminDashboard/layout';
import { postData } from '../../services/apiServices';
import Swal from 'sweetalert2';
import { FaCheckSquare, FaImage, FaCaretDown, FaToggleOn } from 'react-icons/fa';
import { IoMdCheckboxOutline, IoMdRadioButtonOn } from "react-icons/io";
import { RxCross2, RxDropdownMenu } from "react-icons/rx";
import { IoImages } from "react-icons/io5";

// Modal Component
function QuestionAnsModal({ show, onHide, onSave }) {
  const [key, setKey] = useState('radio');
  const [questionText, setQuestionText] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState([{ value: '', correct: false }]);
  const [imageOptions, setImageOptions] = useState([{ imageUrl: '', correct: false }]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const handleOptionChange = (index, field, value) => {
    const updatedOptions = [...options];
    if (field === 'correct') {
      updatedOptions[index][field] = !updatedOptions[index][field];
    } else {
      updatedOptions[index][field] = value;
    }
    setOptions(updatedOptions);
  };

  const handleImageChange = (index, field, value) => {
    const updated = [...imageOptions];
    if (field === 'correct') {
      updated[index][field] = !updated[index][field];
    } else {
      updated[index][field] = value;
    }
    setImageOptions(updated);
  };

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];
    const imageUrl = URL.createObjectURL(file);  // Create a local URL for the uploaded image
    const updated = [...imageOptions];
    updated[index].imageUrl = imageUrl;  // Set the image URL
    setImageOptions(updated);

    // Preview the image
    const newImagePreviews = [...imagePreviews];
    newImagePreviews[index] = imageUrl;
    setImagePreviews(newImagePreviews);
  };

  const addOption = () => {
    setOptions([...options, { value: '', correct: false }]);
  };

  const addImageOption = () => {
    setImageOptions([...imageOptions, { imageUrl: '', correct: false }]);
    setImagePreviews([...imagePreviews, '']); // Add an empty preview for the new image option
  };

  const handleSave = () => {
    const newQuestion = {
      type: key,
      question: questionText,
      description,
      options: key === 'image' ? imageOptions : options,
    };
    onSave(newQuestion);
    setQuestionText('');
    setDescription('');
    setOptions([{ value: '', correct: false }]);
    setImageOptions([{ imageUrl: '', correct: false }]);
    setImagePreviews([]);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Question</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3 QuestTabs">
          <Tab eventKey="radio" title={<span><IoMdRadioButtonOn className="me-1" /> Radio Button</span>} ></Tab>
          <Tab eventKey="checkbox" title={<span><IoMdCheckboxOutline className="me-1" /> Check Box</span>}> </Tab>
          <Tab eventKey="dropdown" title={ <span><RxDropdownMenu className="me-1" /> Drop Down</span> } ></Tab>
          <Tab eventKey="image"title={ <span><IoImages className="me-1" /> Image Options</span>} ></Tab>
          <Tab eventKey="truefalse"title={ <span><FaToggleOn className="me-1" /> True / False</span> }></Tab>
        </Tabs>

        <Form>
          <Form.Group className='QuestionFormInpt'>
            <Form.Label>Question</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Enter your question..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </Form.Group>

          {(key === 'radio' || key === 'checkbox' || key === 'dropdown') && (
            <>
              <Form.Label className="mt-3">Options</Form.Label>
              {options.map((option, idx) => (
                <Row key={idx} className="align-items-center mb-2">
                  <Col xs={10}>
                    <Form.Control
                      value={option.value}
                      placeholder={`Option ${idx + 1}`}
                      onChange={(e) => handleOptionChange(idx, 'value', e.target.value)} />
                  </Col>
                  <Col xs={2}>
                    <div className="OptionCross">
                      <Form.Check
                        label="Correct"
                        checked={option.correct}
                        onChange={() => handleOptionChange(idx, 'correct')}/>
                      <Button><RxCross2 /></Button>
                    </div>
                  </Col>
                  
                </Row>
              ))}
              <Button variant="outline-primary" size="sm" onClick={addOption}>
                Add Option
              </Button>
            </>
          )}

          {key === 'image' && (
            <>
              <Form.Label className="mt-3"><strong>Image Options</strong></Form.Label>
              {imageOptions.map((option, idx) => (
                <Row key={idx} className="align-items-center mb-2">
                  <Col xs={8}>
                    <Form.Control
                      type="file"
                      onChange={(e) => handleImageUpload(idx, e)}
                    />
                  </Col>
                  <Col xs={4}>
                    <Form.Check
                      label="Correct"
                      checked={option.correct}
                      onChange={() => handleImageChange(idx, 'correct')}
                    />
                  </Col>
                </Row>
              ))}
              <Button variant="outline-primary" size="sm" onClick={addImageOption}>
                Add Image Option
              </Button>

              {/* Display image previews */}
              {imagePreviews.map((preview, idx) => (
                preview && (
                  <div key={idx} className="mt-2">
                    <img src={preview} alt={`Image Option ${idx}`} width="100" height="100" />
                  </div>
                )
              ))}
            </>
          )}

          {key === 'truefalse' && (
            <>
              <Form.Label className="mt-3"><strong>Options</strong></Form.Label>
              <Row className="mb-2">
                <Col xs={12}>
                  <Form.Check
                    type="radio"
                    label="True"
                    checked={options[0]?.correct}
                    onChange={() => handleOptionChange(0, 'correct', true)}
                  />
                </Col>
                <Col xs={12}>
                  <Form.Check
                    type="radio"
                    label="False"
                    checked={options[1]?.correct}
                    onChange={() => handleOptionChange(1, 'correct', false)}
                  />
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="success" onClick={handleSave}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}


// Main Component
function AddAssessment() {
  const [modalShow, setModalShow] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: '' });
  const [errors, setErrors] = useState({});
  const [questionsList, setQuestionsList] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [locked, setLocked] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Assessment name is required';
    if (!formData.type.trim()) newErrors.type = 'Assessment type is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      try {
        const fhirAssessment = {
          resourceType: "Questionnaire",
          status: "active",
          title: formData.name,
          description: formData.type,
          item: []
        };
        const result = await postData('fhir/v1/assessments?action=add', fhirAssessment);
        if (result.status === 200) {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Assessment added successfully.',
          });
          setShowQuestions(true);
        }
      } catch (error) {
        const message = error?.response?.data?.issue?.[0]?.details?.text || "An error occurred.";
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: message,
        });
      }
    }
  };

  const handleSaveQuestion = (newQuestion) => {
    setQuestionsList(prev => [...prev, newQuestion]);
    setAnswers(prev => [...prev, null]);
    setFeedbacks(prev => [...prev, '']);
    setLocked(prev => [...prev, false]);
  };

  const handleAnswer = (questionIndex, value, isCorrect) => {
    if (locked[questionIndex]) return;

    const newAnswers = [...answers];
    const newFeedbacks = [...feedbacks];
    const newLocked = [...locked];

    newAnswers[questionIndex] = value;
    newFeedbacks[questionIndex] = isCorrect ? '✅ Correct' : '❌ Wrong';
    newLocked[questionIndex] = true;

    setAnswers(newAnswers);
    setFeedbacks(newFeedbacks);
    setLocked(newLocked);
  };

  return (
    <AdminDashboardLayout dashName="Assessment">
      <Container>
        <div className="AssessmentDiv">
          <Form onSubmit={handleSubmit}>
            <div className="AsstHeading">
              <h2>Assessment Details</h2>
            </div>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Assessment Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    isInvalid={!!errors.name}
                  />
                  <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Assessment Type</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    isInvalid={!!errors.type}
                  />
                  <Form.Control.Feedback type="invalid">{errors.type}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={12}>
                <div className="AssmtSub">
                  <Button type="submit">Submit</Button>
                </div>
              </Col>
            </Row>
          </Form>
        </div>

        {showQuestions && (
          <div className="AssessmentControl">
            <div className="QuestionHead d-flex justify-content-between align-items-center">
              <h4>All Questions</h4>
              <Button onClick={() => setModalShow(true)}>
                <FaPlus /> Create New Question
              </Button>
            </div>

            <QuestionAnsModal
              show={modalShow}
              onHide={() => setModalShow(false)}
              onSave={handleSaveQuestion}
            />

            <div className="QestionsItems mt-4">
              {questionsList.length === 0 ? (
                <p>No questions added yet.</p>
              ) : (
                questionsList.map((q, idx) => (
                  <Card key={idx} className="mb-3">
                    <Card.Body>
                      <Card.Title><strong>{q.question}</strong></Card.Title>
                      {/* <Card.Subtitle className="mb-2 text-muted">{q.type}</Card.Subtitle> */}

                      <Form>
                        {/* Render Radio/Checkbox/Dropdown based on type */}
                        {q.type === 'radio' && q.options.map((opt, i) => (
                          <Form.Check
                            key={i}
                            type="radio"
                            name={`radio_${idx}`}
                            label={opt.value}
                            onChange={() => handleAnswer(idx, opt.value, opt.correct)}
                            checked={answers[idx] === opt.value}
                            disabled={locked[idx]}
                          />
                        ))}

                        {q.type === 'checkbox' && q.options.map((opt, i) => (
                          <Form.Check
                            key={i}
                            type="checkbox"
                            label={opt.value}
                            onChange={() => handleAnswer(idx, opt.value, opt.correct)}
                            disabled={locked[idx]}
                          />
                        ))}

                        {q.type === 'dropdown' && (
                          <Form.Select
                            value={answers[idx] || ''}
                            onChange={(e) => {
                              if (locked[idx]) return;
                              const val = e.target.value;
                              const correct = q.options.find(opt => opt.value === val)?.correct;
                              handleAnswer(idx, val, correct);
                            }}
                            disabled={locked[idx]}
                          >
                            <option value="">Select</option>
                            {q.options.map((opt, i) => (
                              <option key={i} value={opt.value}>{opt.value}</option>
                            ))}
                          </Form.Select>
                        )}

                        {q.type === 'image' && q.options.map((opt, i) => (
                          <div key={i} style={{ display: 'inline-block', marginRight: 10 }}>
                            <img
                              src={opt.imageUrl}
                              alt={`Option ${i}`}
                              width={100}
                              height={100}
                              style={{
                                border: answers[idx] === opt.imageUrl ? '3px solid green' : '1px solid gray',
                                cursor: locked[idx] ? 'not-allowed' : 'pointer',
                              }}
                              onClick={() => {
                                if (!locked[idx]) {
                                  handleAnswer(idx, opt.imageUrl, opt.correct);
                                }
                              }}
                            />
                          </div>
                        ))}

                        {q.type === 'truefalse' && ['True', 'False'].map((val, i) => (
                          <Form.Check
                            key={i}
                            type="radio"
                            name={`truefalse_${idx}`}
                            label={val}
                            onChange={() => handleAnswer(idx, val, val === 'True')}
                            checked={answers[idx] === val}
                            disabled={locked[idx]}
                          />
                        ))}
                      </Form>

                      {feedbacks[idx] && (
                        <p className="mt-2"><strong>{feedbacks[idx]}</strong></p>
                      )}
                    </Card.Body>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </Container>
    </AdminDashboardLayout>
  );
}

export default AddAssessment;

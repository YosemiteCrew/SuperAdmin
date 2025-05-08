import React, { useState } from 'react';
import "./Assessment.css";
import { Button, Col, Container, Form, Row, Tab, Tabs } from 'react-bootstrap';
import AdminDashboardLayout from '../AdminDashboard/layout';
import { BiArrowBack } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { MdOutlineAdd } from 'react-icons/md';
import  {postData} from '../../services/apiServices';
import Swal from 'sweetalert2';

function AddAssessment() {
  const [showQuestions, setShowQuestions] = useState(false);
  const [showTabs, setShowTabs] = useState(false);



  const [formData, setFormData] = useState({
    name: '',
    type: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: '' }); // Clear error on change
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
          title: formData.name, // name
          description: formData.type, // type
          item: []
        };
        const result = await postData('fhir/v1/assessments?action=add', fhirAssessment);
        if(result.status ==200){
          Swal.fire({
            icon: 'success',
            title: 'success',
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



  return (
    <>
      <AdminDashboardLayout dashName="Assessment">
        <section className='AssessmentSection'>
          <Container>
            <div className="ss">

              <div className="AssessmentDiv">
              <Form onSubmit={handleSubmit}>
              <div className="AsstHeading">
                <h2>Assessment Details</h2>
              </div>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3" controlId="formAssessmentName">
                    <Form.Label>Assessment Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      isInvalid={!!errors.name}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.name}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group className="mb-3" controlId="formAssessmentType">
                    <Form.Label>Assessment Type</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      isInvalid={!!errors.type}
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.type}
                    </Form.Control.Feedback>
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
                <div className="AssessmentFormQest">
                  <div className="AssmentQuestions">
                    <div className="QustHead" onClick={() => setShowTabs(false)}>
                      <h6><BiArrowBack /> Questions</h6>
                    </div>

                    {!showTabs && (
                      <div className="Questions_Here" onClick={() => setShowTabs(true)}>
                        <p>
                          <Link to="#" onClick={(e) => e.preventDefault()}>Click Here</Link> to add questions
                        </p>
                      </div>
                    )}

                    {showTabs && (
                      <div className="AstQuestTabs">
                        <Tabs defaultActiveKey="mcq" id="uncontrolled-tab-example" className="mb-3">
                          <Tab eventKey="summry" title="Summary">
                            <p>Tab content for Summary</p>
                          </Tab>
                          <Tab eventKey="mcq" title="MCQ">
                            <p>Tab content for MCQ</p>
                          </Tab>
                          <Tab eventKey="truefalse" title="T/F">

                              <div className="QustInpt">
                                <h6>1.</h6>
                                <Form.Control as="textarea"/>
                              </div>
                            
                          </Tab>
                        </Tabs>
                      </div>
                    )}

                    {showTabs && (
                      <div className="adqestbtn">
                        <Button> <MdOutlineAdd/> Add Question </Button>
                      </div>
                    )}
                    
                  </div>

                  <div className="AsstQuestPerview">
                    {/* Optional: Add preview area here */}
                  </div>
                </div>
              )}

            </div>
          </Container>
        </section>
      </AdminDashboardLayout>
    </>
  );
}

export default AddAssessment;

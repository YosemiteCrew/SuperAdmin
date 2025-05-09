import React, { useState } from 'react';
import "./Assessment.css";
import { Button, Col, Container, Form, Row, Tab, Tabs } from 'react-bootstrap';
import AdminDashboardLayout from '../AdminDashboard/layout';
import { BiArrowBack } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { MdOutlineAdd } from 'react-icons/md';
import  {postData} from '../../services/apiServices';
import Swal from 'sweetalert2';
import { FiPlusCircle, FiSearch } from 'react-icons/fi';
import { FaList, FaPlus } from 'react-icons/fa';
import { IoGrid } from 'react-icons/io5';

function AddAssessment() {
  const [showQuestions, setShowQuestions] = useState(false);
  // const [showTabs, setShowTabs] = useState(false);



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
            <div className="AstDetlForm">

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

                  <div className="QuestionHead">
                    <h4>All Questions</h4>
                    <Button> <FaPlus/> Create New Question</Button>
                  </div>

                  <div className="QuestionListDiv">

                    <div className="QuestionFilterDiv">
                      <div className="serch">
                        <FiSearch />
                        <Form.Control type="search" id="inputsearch" aria-describedby="searchblock"/>
                      </div>
                      <div className="qustype">
                        <Form.Select aria-label="Default select example">
                          <option>Question type</option>
                          <option value="1">One</option>
                          <option value="2">Two</option>
                          <option value="3">Three</option>
                        </Form.Select>
                      </div>
                      <div className="quscate">
                        <Form.Select aria-label="Default select example">
                          <option>category</option>
                          <option value="1">One</option>
                          <option value="2">Two</option>
                          <option value="3">Three</option>
                        </Form.Select>
                      </div>
                      <Button>Search</Button>
                    </div>
                    <div className="QuestionGridDiv">
                      <Button><FaList/></Button>
                      <Button><IoGrid/></Button>
                    </div>

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

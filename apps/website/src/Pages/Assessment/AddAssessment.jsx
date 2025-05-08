import React, { useState } from 'react';
import "./Assessment.css";
import { Button, Col, Container, Form, Row, Tab, Tabs } from 'react-bootstrap';
import AdminDashboardLayout from '../AdminDashboard/layout';
import { BiArrowBack } from 'react-icons/bi';
import { Link } from 'react-router-dom';
import { MdOutlineAdd } from 'react-icons/md';

function AddAssessment() {
  const [showQuestions, setShowQuestions] = useState(false);
  const [showTabs, setShowTabs] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowQuestions(true);
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
                        <Form.Control type="text" placeholder="Enter name" required />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group className="mb-3" controlId="formAssessmentType">
                        <Form.Label>Assessment Type</Form.Label>
                        <Form.Control type="text" placeholder="Enter type" required />
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

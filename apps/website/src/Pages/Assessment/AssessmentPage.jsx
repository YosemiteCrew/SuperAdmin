import React  from 'react'
import "./Assessment.css";
import AdminDashboardLayout from '../AdminDashboard/layout'
import {  Button, Col, Container, Dropdown, Form, Image, Modal, Row } from 'react-bootstrap'
// import AssessmentTable from '../../Components/AssessmentTable/AssessmentTable'
import { Link } from 'react-router-dom';
import { FiPlusCircle } from 'react-icons/fi';
import { FiSearch } from 'react-icons/fi';
import { FaList, FaPlus } from 'react-icons/fa';
import { IoGrid } from 'react-icons/io5';
import { TiUser } from "react-icons/ti";
import { RxDotsVertical } from "react-icons/rx";

function AssessmentPage() {

  
    
    
  

  return (
    <>
        <AdminDashboardLayout dashName="Assessment Page">
            <Container fluid>
                <div className="AssessmentListing">

                  <div className="AssmntList">
                    <h2>Assessment List</h2>
                    <Link to="/addassessment"><FiPlusCircle /> Add Assessment</Link>
                  </div>


                  <div className="AssessmentFormQest">

                    <div className="QuestionHead">
                      <h4>All Questions</h4>
                      <Button> <FaPlus/> Create New Question</Button>
                    </div>

                    <div className="TotalQuestDiv">
                      <div className="TotalItems">
                        <div className="user">
                          <TiUser/>
                        </div>
                        <div className="TotQstTxt">
                          <p>Total Question</p>
                          <h4>1399</h4>
                        </div>
                      </div>
                      <div className="TotalItems">
                        <div className="user">
                          <TiUser/>
                        </div>
                        <div className="TotQstTxt">
                          <p>Assign Category</p>
                          <h4>6</h4>
                        </div>
                      </div>
                    </div>

                    <div className="QuestionCardData">

                      <div className="QuestionListDiv">
                        <div className="QuestionFilterDiv">
                          <div className="serch">
                            <FiSearch />
                            <Form.Control type="search" id="inputsearch" aria-describedby="searchblock" placeholder='Search'/>
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

                      <div className="QuestCardItems">
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                        <QuestCards/>
                      </div>

                    </div>

                    

                  
                  </div>





                  {/* <AssessmentTable/> */}

                </div>

            </Container>
        </AdminDashboardLayout>



    </>
  )
}

export default AssessmentPage




function QuestCards() {
  return <div className="QstCard">

    <div className="TpQst">
      <div className="text">
        <h4>Capsule</h4>
        <p>12/05/2025</p>
      </div>
      <div className="filtbtn">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic">
            <RxDotsVertical />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item href="#/action-1">Today</Dropdown.Item>
            <Dropdown.Item href="#/action-2">This Month</Dropdown.Item>
            <Dropdown.Item href="#/action-3">This Year</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>

    <div className="MdQst">
      <h6>Total Question</h6>
      <span>5</span>
    </div>

    <div className="BtQst">
      <div className="lftname">
        <Image src="https://img.freepik.com/free-vector/follow-me-social-business-theme-design_24877-50426.jpg?t=st=1747041469~exp=1747045069~hmac=ae6195c5a14055dc5dbaf802d40001a0bac153cf1bcd1b6b260a015e24ae3738&w=740" alt="" roundedCircle width={28} height={28} />
        <h5>Sohan Ahmed</h5>
      </div>
      <div className="rytTag">
        <h6>Tags:</h6>
        <span>
          <p>Tag 1</p>
          <p>Tag 2</p>
          <p>Tag 3</p>
        </span>
      </div>
    </div>

  </div>;
}

import React, { useState } from 'react'
import "./AdminProfile.css"
import AdminDashboardLayout from '../AdminDashboard/layout'
import { Button, Col, Container, Form, Image, Modal, Row } from 'react-bootstrap'
import { FaCamera, FaUserCheck } from 'react-icons/fa';
import { BiSolidEditAlt } from 'react-icons/bi';
import { MdMarkEmailRead, MdOutlineLocalPhone } from 'react-icons/md';
import { IoLocationOutline } from 'react-icons/io5';


// Edit Profile Modal

function EditProfile (props) {
    return (
        <Modal className='EditProfModal' {...props} size="lg" aria-labelledby="contained-modal-title-vcenter"centered >

        <Modal.Header closeButton>
            <Modal.Title id="contained-modal-title-vcenter"> Edit Profile</Modal.Title>
        </Modal.Header>

        <Modal.Body>

            <div className="EditProfileDiv mt-3 mb-3">

                <Row>
                    <Col md={6} className='mt-3' >
                        <Form.Group className='profileForm' controlId="validationCustom01">
                            <Form.Label>First name :</Form.Label>
                            <Form.Control required type="text" placeholder="First name"/>
                        </Form.Group>
                    </Col>
                    <Col md={6} className='mt-3' >
                        <Form.Group className='profileForm' controlId="validationCustom01">
                            <Form.Label>Last name :</Form.Label>
                            <Form.Control required type="text" placeholder="Last name" />
                        </Form.Group>
                    </Col>
                </Row>

                <Row >
                    <Col md={6} className='mt-3' >
                        <Form.Group className='profileForm' controlId="validationCustom01">
                            <Form.Label>Date of Birth :</Form.Label>
                            <Form.Control required  type="date"/>
                        </Form.Group>
                    </Col>
                    <Col md={6} className='mt-3' >
                        <Form.Group className='profileForm' controlId="validationCustom01">
                            <Form.Label>Gender :</Form.Label>
                            <Form.Select aria-label="Default select example">
                                <option>Select gender</option>
                                <option value="1">male</option>
                                <option value="2">Female</option>
                                <option value="3">Other</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={6} className='mt-3'>
                        <Form.Group className='profileForm' controlId="validationCustom01">
                            <Form.Label>Role :</Form.Label>
                            <Form.Select aria-label="Default select example">
                                <option>Select Role</option>
                                <option value="1">Administrator</option>
                                <option value="2">SuperAdmin</option>
                                <option value="3">Administrator</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6} className='mt-3' >
                        <Form.Group className='profileForm' controlId="validationCustom01">
                            <Form.Label>Email :</Form.Label>
                            <Form.Control required type="email" placeholder="@yupmail.com" />
                        </Form.Group>
                    </Col>
                    
                </Row>

            </div>
        </Modal.Body>

        <Modal.Footer>
            <Button onClick={props.onHide}>Discard changes</Button>
            <Button >Save</Button>
        </Modal.Footer>

        </Modal>
    );
}
  
// Edit Profile Modal



function AdminProfile() {

    const [modalShow, setModalShow] = React.useState(false);

    // State for images
  const [coverImage, setCoverImage] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  // Handle cover image change
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile image change
  const handleProfileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <>
    <AdminDashboardLayout dashName="Admin Profile">

        <section className='AdminProfileSec'>
            <Container fluid>

               <Row>

                <Col md={8}>

                    <div className="AdminProfDiv">

                        <div className="AdminCover">
                            <Image src={coverImage || "/Images/Logo.png"} alt="Logo" width={270} height={270}/>
                            <input type="file" accept=".jpg,.jpeg,.png" onChange={handleCoverChange}/>
                            <div className="uplodCover">
                                <FaCamera />
                            </div>
                        </div>

                        <div className="AdminProfilePicture">
                            <Image src={profileImage  || "/Images/Logo.png"} alt="Logo" width={270} height={270}/>
                            <input type="file" accept=".jpg,.jpeg,.png" onChange={handleProfileChange}/>
                            <div className="profleupld">
                                <BiSolidEditAlt />
                            </div>
                        </div>

                        <div className="AdminEditProfile">
                            <div className="LftEdit">
                                <div className="admininfo">
                                    <h3>Dr. Clay Jensen</h3>
                                    <div className="adress">
                                        <Image src="https://img.freepik.com/free-vector/illustration-european-union-flag_53876-27018.jpg?t=st=1746005837~exp=1746009437~hmac=12472b7fcb214cab0a6626843c3f57a942d4601636470466cbf65ba8d5eebf19&w=1380" alt="Logo" width={25} height={15}/>
                                        <span>| Tietgensgade 137 8800 VIBORG DENMARK</span>
                                    </div>
                                    <div className="status">
                                        <span><strong>Age :</strong> 24 </span>
                                        <span><strong>Gender :</strong> Male </span>
                                        <span><strong>Status :</strong> <span className='blinkActive'>Active*</span> </span>
                                    </div>
                                </div>
                                <div className="AdminRole">
                                    <div className="Roleinfo">
                                        <span><FaUserCheck/> Role : </span>
                                        <h6>Administrator</h6>
                                    </div>
                                    <div className="Roleinfo">
                                        <span><MdMarkEmailRead/> Email : </span>
                                        <h6>clay.jansen@gmail.com</h6>
                                    </div>
                                    <div className="Roleinfo">
                                        <span><MdOutlineLocalPhone /> Contact : </span>
                                        <h6>(+61) (45687) (45687)</h6>
                                    </div>
                                    <div className="Roleinfo">
                                        <span><IoLocationOutline/> Region : </span>
                                        <h6>Central US</h6>
                                    </div>
                                </div>
                            </div>
                            <div className="RightEdit">
                                <Button onClick={() => setModalShow(true)} ><BiSolidEditAlt /> Edit Profile</Button>
                                <EditProfile  show={modalShow}  onHide={() => setModalShow(false)} />
                            </div>
                        </div>

                        <div className="YourAdminActivity mt-5">

                            <div className="ActivityTitle">
                                <h2>Your Activities</h2>
                            </div>


                        </div>





                    </div>


                
                
                
                
                
                
                
                
                
                
                </Col>

                <Col md={4}>

                    <div className="RightAdminProfile">

                        <div className="RecentActivity">
                            <div className="ResentTitle">
                                <h4>Recent Activities</h4>
                            </div>

                            <div className="ResentStatusDiv">

                                <div className="ResentItems">
                                    <h6>Bryce Walker added a role "Worker-2" </h6>
                                    <p>11/02/2023 <br /> 10:40:35 AM</p>
                                </div>
                                <div className="ResentItems">
                                    <h6>Bryce Walker added a role "Worker-2" </h6>
                                    <p>11/02/2023 <br /> 10:40:35 AM</p>
                                </div>
                                <div className="ResentItems">
                                    <h6>Bryce Walker added a role "Worker-2" </h6>
                                    <p>11/02/2023 <br /> 10:40:35 AM</p>
                                </div>
                                <div className="ResentItems">
                                    <h6>Bryce Walker added a role "Worker-2" </h6>
                                    <p>11/02/2023 <br /> 10:40:35 AM</p>
                                </div>
                                <div className="ResentItems">
                                    <h6>Bryce Walker added a role "Worker-2" </h6>
                                    <p>11/02/2023 <br /> 10:40:35 AM</p>
                                </div>
                                <div className="ResentItems">
                                    <h6>Bryce Walker added a role "Worker-2" </h6>
                                    <p>11/02/2023 <br /> 10:40:35 AM</p>
                                </div>





                            </div>





                        </div>





                        
                    </div>
                
                
                
                
                </Col>
                    
               </Row>













            </Container>
        </section>

    </AdminDashboardLayout>

        





    </>
  )
}

export default AdminProfile
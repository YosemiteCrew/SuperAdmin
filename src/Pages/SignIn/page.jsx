import React, { useState }  from 'react'
import { useNavigate } from 'react-router-dom';
import "./SignIn.css"
import { Button, Col, Container, FloatingLabel, Form, Image, Row } from 'react-bootstrap'

import  authService from '../../services/authService';
// import Image from 'next/image'


function SignIn() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate(); // Get the navigate function from React Router


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await authService.login(email, password);
      if(result.status ===200){
        authService.saveToken(result.data.token);
        setMessage(result.data.message);
        navigate('/'); // Navigate to the Home page after successful login
      } else{
          
        setMessage(result.data.message);

      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <>

      <section className='SignSec'>
        <Container fluid>

          <div className="SignFormDiv">

            <div className="SignUpForm">

              <div className="LogoPicture">
                <Image src="/Images/Logo.png" width="80" height="80" alt="Picture of the author" />
              </div>

              <div className="SignHead">
                <h2>Sign in with email</h2>
                <p>Make a new doc to bring your words, data, <br /> and teams together. For free</p>
              </div>

              <Form onSubmit={handleLogin}>
                <Row className='mb-3'>
                  <Col md={12}>
                    <FloatingLabel controlId="floatingInput" label="Email " className="SignFormControl">
                      <Form.Control  type="email" value={email}   onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com"  />
                    </FloatingLabel>
                  </Col>
                </Row>

                <Row className='mb-3'>
                  <Col md={12}>
                    <FloatingLabel controlId="floatingPassword" label="Password" className="SignFormControl">
                      <Form.Control  type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" />
                    </FloatingLabel>
                    <div className="error"> {message}</div>
                  </Col>
                </Row>

                <Row className='mb-3'>
                  <Col md={12}>
                    <div className="SignBTN">
                      <Button type='submit'>Get Started</Button>
                    </div>
                    
                  </Col>
                </Row>
              </Form>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

export default SignIn
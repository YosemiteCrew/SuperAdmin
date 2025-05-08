import React from 'react'
import "./SignIn.css"
import { Button, Col, Container, FloatingLabel, Form, Image, Row } from 'react-bootstrap'
// import Image from 'next/image'


function SignIn() {
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

              <Form>

                <Row className='mb-3'>
                  <Col md={12}>
                    <FloatingLabel controlId="floatingInput" label="Email " className="SignFormControl">
                      <Form.Control type="email" placeholder="name@example.com"  />
                    </FloatingLabel>
                  </Col>
                </Row>

                <Row className='mb-3'>
                  <Col md={12}>
                    <FloatingLabel controlId="floatingPassword" label="Password" className="SignFormControl">
                      <Form.Control type="password" placeholder="Password" />
                    </FloatingLabel>
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
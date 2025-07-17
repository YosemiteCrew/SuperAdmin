"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import CustomToast from "../../Components/Toasts/CustomToast";
import { MailCheck, Lock, Check, ShieldCheck, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import axios from "axios";

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 
  const [formData, setFormData] = useState({
      email: "",
      authCode: "",
      password: "",
      confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    authCode: "",
    password: "",
    confirmPassword: "",
  });

  const [generatedCode, setGeneratedCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);

  const handleInputChange = (e: any) => {
    const { name, type, value, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setFormData({ ...formData, [name]: fieldValue });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleNextStep = async () => {
    
    const newErrors: any = {};
    if (step === 1) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

        if (!formData.email) {
          newErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
          newErrors.email = "Enter a valid email address";
        }

      setErrors(newErrors);

      if (Object.keys(newErrors).length === 0) {
         try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/forgot-password`, {
            email: formData.email,
          });

          if (res.data.success) {
            setStep(2);
            sendAuthCode();
           
          } 
        } catch (error: any) {
          console.error("user-detail failed", error);
          //toast.error(error?.response?.data?.message || "Something went wrong with userdetail");
          toast(
            <CustomToast
              title="Error!"
              message={error?.response?.data?.message || "Something went wrong with userdetail"}
              type="error"
            />,
            { className: "toast-error" }
          );
          
        }
        
      }
    } else if (step === 2) {
      if (!formData.authCode) {
          newErrors.authCode = "Code is required";
        } else if (formData.authCode !== generatedCode) {
          newErrors.authCode = "Invalid code";
        }

        console.log("newErrors",newErrors);
        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {

        setStep(3);
        
        
      }

     
    } else if (step === 3) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
      if (!formData.password) {
          newErrors.password = "Password is required";
        } else if (!passwordRegex.test(formData.password)) {
          newErrors.password = "Password must be 8+ chars with upper, lower, and special character";
        }

        if (!formData.confirmPassword) {
          newErrors.confirmPassword = "Confirm Password is required";
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length === 0) {
          //setStep(4);
           try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/reset-password`, {
              email: formData.email,
              password: formData.password,
              confirmPassword: formData.confirmPassword,
            });

            if (res.data.success) {
              toast(
              <CustomToast
                title="Success!"
                message={"Password reset successfully. You can now login."}
                type="success"
              />,
              { className: "toast-error" }
            );
            router.push("/Auth/Login");
            
            } 
          } catch (error: any) {
           
            //toast.error(error?.response?.data?.message || "Something went wrong with userdetail");
            toast(
              <CustomToast
                title="Error!"
                message={error?.response?.data?.message || "Something went wrong with userdetail"}
                type="error"
              />,
              { className: "toast-error" }
            );
            
          }
        }
      
      
    }
  };

  const sendAuthCode = async () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setIsCodeSent(true);

      try {
          

          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/send-email`, {
            toEmail: formData.email,
            code,
          });

          
          if (response.data.success) {
            //toast.success("Authentication code sent to your email.");
            toast(
              <CustomToast
                title="Success!"
                message="Authentication code sent to your email."
                type="success"
              />,
              { className: "toast-success" }
            );
          //alert("Authentication code sent to your email.");
          } else {
          //alert("Failed to send email.");
          //toast.error(response.data.message || "Failed to send email.");
          toast(
            <CustomToast
              title="Error!"
              message={response.data.message || "Failed to send email."}
              type="error"
            />,
            { className: "toast-error" }
          );
          }
      } catch (error) {
          console.error("Email error:", error);
          const message = error.response?.data?.message || "Something went wrong while sending the code.";
          //toast.warning(message);
          toast(
            <CustomToast
              title="Error!"
              message={message}
              type="error"
            />,
            { className: "toast-error" }
          );
      }
    };



 

  const goBack = () => {
    setStep(1);
    setErrors({ email: "", authCode: "" });
  };

  const getStepImage = () => {
    return `/Images/signup-step${step}.png`;
  };

  return (
    <section className="form-section py-5">
      <Container fluid>
        <Row className="min-vh-100">
          {/* Left Image Block */}
          <Col md={6} className="d-none d-md-block p-0">
            <div
              className="h-100 w-100 bg-cover bg-center"
              style={{
                backgroundImage: `url(${getStepImage()})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </Col>

          {/* Right Login Form */}
          <Col md={6} className="d-flex align-items-center justify-content-center">
            <div className="auth-box p-5 shadow-lg w-100" style={{ maxWidth: "450px" }}>
              

              {/* Step 1: Email */}
              {step === 1 && (
                
                <Form>
                  <h4 className="mb-4 fw-bold">Forgot Password? </h4>
                  <p className="text-muted text-center mb-3">
                    Enter your registered email, and we’ll send you a code to reset it.
                  </p>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      placeholder="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      
                     
                      isInvalid={!!errors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  

                   

                  <Button variant="dark" className="w-100" onClick={handleNextStep}>
                     Send Code
                  </Button>

                  
                </Form>
              )}

              {/* Step 2: 2FA Code */}
              {step === 2 && (
                <Form>
                  <div className="d-flex align-items-center mb-3">
                    {/* <Button variant="link" onClick={goBack}><ChevronLeft /></Button> */}
                    
                    <h5 className="ms-2">Verify Code</h5>
                  </div>
                  <p className="text-muted text-center mb-3">
                    Enter the code we just sent to your email to proceed with resetting your password.
                  </p>

                  

                  <Form.Control
                    type="text"
                    name="authCode"
                    value={formData.authCode}
                    onChange={handleInputChange}
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="text-center fs-4 mb-3"
                    isInvalid={!!errors.authCode}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.authCode}
                  </Form.Control.Feedback>

                  <Button variant="dark" className="w-100" onClick={handleNextStep}>
                    <Lock className="me-2" /> Verify Code
                  </Button>

                  {/* <Button
                    variant="outline-secondary"
                    className="w-100 mt-2"
                    onClick={goBack}
                  >
                    <ChevronLeft className="me-2" />
                    Back
                  </Button> */}
                </Form>
              )}

               {/* Step 3: Password confirm-Password */}
              {step === 3 && (
                
                <Form>
                  <h4 className="mb-4 fw-bold">Set new password </h4>
                 
                  <Form.Group className="mb-3">
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      isInvalid={!!errors.password}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                    {/* Eye Icon */}
                      <span onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </span>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      isInvalid={!!errors.confirmPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                    {/* Eye Icon */}
                      <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </span>
                  </Form.Group>

                  

                   

                  <Button variant="dark" className="w-100" onClick={handleNextStep}>
                    <Check className="me-2" /> Reset Password
                  </Button>

                  
                </Form>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

"use client";
import React, { useState, useEffect, useRef } from "react";
import "../Auth.css"
import { ChevronLeft, QrCode, Smartphone, Mail, Check , Eye, EyeOff} from "lucide-react";
import { useRouter } from "next/navigation";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import CustomToast from "../../Components/Toasts/CustomToast";
import CustomAlert from "../../Components/Alerts/CustomAlert";
import axios from "axios";
import Header from "@/app/Components/Header/Header";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import Image from "next/image";

type FormControlElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;



const Signup = () => {
  const [step, setStep] = useState(3);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    userType: "admin",
    email: "",
    password: "",
    confirmPassword: "",
    authCode: "",
    twofaCode: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    authCode: "",
    twofaCode: "",
    agreeTerms: "",
  });



  const [generatedCode, setGeneratedCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);

  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");

  const router = useRouter();

  
  type FieldName = "email" | "password" | "confirmPassword" | "authCode" | "twofaCode" | "agreeTerms";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;
    const fieldName = name as FieldName;

    setFormData({ ...formData, [fieldName]: fieldValue });

    if (errors[fieldName]) {
      setErrors({ ...errors, [fieldName]: "" });
    }
  };

  useEffect(() => {
    if (step === 3 && formData.email) {
      axios
        .get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/2fa/generate`, {
          params: { email: formData.email },
        })
        .then((res) => {
          setQrCode(res.data.qrCode);
          setSecret(res.data.base32);
        })
        .catch((err) => {
          console.error("QR generation error:", err);
          //toast.error("Failed to generate 2FA QR code");
          toast(
            <CustomToast
              title="Error!"
              message={"Failed to generate 2FA QR code"}
              type="error"
            />,
            { className: "toast-error" }
          );
        });
    }
  }, [step, formData.email]);

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

        if (!formData.agreeTerms) {
          newErrors.agreeTerms = "You must agree to the terms";
        }
      

     

      setErrors(newErrors);

      if (Object.keys(newErrors).length === 0) {
         try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-detail`, {
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

        
        try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/signup`, {
            email: formData.email,
            password: formData.password,
            userType: formData.userType,
          });

          

          if (res.data.success) {
            //toast.success("Signup successful. Please set up 2FA.");
            toast(
              <CustomToast
                title="Success!"
                message="Signup successful. Please set up 2FA."
                type="success"
              />,
              { className: "toast-success" }
            );
            setStep(3);
           
          } else {
            setErrors((prev) => ({
              ...prev,
              twofaCode: res.data.message || "Invalid 2FA code",
            }));
          }
        } catch (error: any) {
          //console.error("Signup failed", error);
          //toast.error(error?.response?.data?.message || "Something went wrong with Signup");
          const apiError = error?.response?.data;

          if (apiError?.errors?.length > 0) {
            //toast.error(apiError.errors[0].message);
            toast(
              <CustomToast
                title="Error!"
                message={apiError.errors[0].message || "Something went wrong with userdetail"}
                type="error"
              />,
              { className: "toast-error" }
            );
          } else {
            //toast.error(apiError?.message || "Something went wrong with Signup");
            toast(
              <CustomToast
                title="Error!"
                message={apiError?.message || "Something went wrong with Signup"}
                type="error"
              />,
              { className: "toast-error" }
            );
          }
        }
        
      }

     
    } else if (step === 3) {
      setStep(4);
      // if (!formData.authCode) {
      //  setErrors(prev => ({
      //     ...prev,
      //     authCode: "Code is required"
      //   }));
      //   return;
      // }
      // if (formData.authCode === generatedCode) {
      //   alert("Account created!");
      //   localStorage.setItem("token", "mockToken123");
      //   router.push("/AdminDashboard");
      // } else {
      //   alert("Invalid code");
      // }
    } else if (step === 4) {
    if (!formData.twofaCode) {
      setErrors(prev => ({
        ...prev,
        twofaCode: "2FA Code is required"
      }));
      return;
    }

    try {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/2fa/verify`, {
      token: formData.twofaCode,
      secret: secret,
      email: formData.email,
    });

    if (res.data.success) {
      //toast.success("2FA Verified & Account Created");
      toast(
        <CustomToast
          title="Success!"
          message="2FA Verified & Account Created"
          type="success"
        />,
        { className: "toast-success" }
      );
      localStorage.setItem("token", res.data.tokenjwt);
      router.push("/AdminDashboard");
    } else {
      setErrors((prev) => ({
        ...prev,
        twofaCode: res.data.message || "Invalid 2FA code",
      }));
    }
  } catch (error: any) {
    
    const apiError = error?.response?.data;

    if (apiError?.errors?.length > 0) {
      //toast.error(apiError.errors[0].message);
      toast(
        <CustomToast
          title="Error!"
          message={apiError.errors[0].message}
          type="error"
        />,
        { className: "toast-error" }
      );
    } else {
      //toast.error(apiError?.message || "Something went wrong with 2FA verification");
      toast(
        <CustomToast
          title="Error!"
          message={apiError?.message || "Something went wrong with 2FA verification"}
          type="error"
        />,
        { className: "toast-error" }
      );
    }
  }
  }
  };

  // const sendAuthCode = () => {
  //   const code = Math.floor(100000 + Math.random() * 900000).toString();
  //   setGeneratedCode(code);
  //   setIsCodeSent(true);
  //   alert(`Code sent to ${formData.email}: ${code}`);
  // };

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
      } catch (error: any) {
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
    if (step > 1) setStep(step - 1);
  };

  const getStepImage = () => {
    return `/Images/signup-step${step}.png`;
  };








  // Otp Started 
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (element: EventTarget & FormControlElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Move to next input
    if (element.value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<FormControlElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };


  // Otp Started 










  return (
    <>
    <Header/>
    
    <section className="SignSection">
        <div className="SignData">
          {/* Left Image Block */}
          <div className="LeftSign" style={{ backgroundImage: `url(${getStepImage()})`, backgroundSize: "cover", backgroundPosition: "center",}}></div>

          {/* Form Section */}
         
          <div className="RightSign">
          
            {/* Step 1 */}
            {step === 1 && (
              <div className="SignInForm">
                <Form>
                  <div className="TopSign">
                    <h2>Sign up now </h2>
                    <Form.Group className="SignInpt">
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
                    <Form.Group className="SignInpt">
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
                    <Form.Group className="SignInpt">
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
                  </div>
                  <Form.Check type="checkbox" name="agreeTerms" label="I agree to the Terms and Privacy Policy" checked={formData.agreeTerms} onChange={handleInputChange} isInvalid={!!errors.agreeTerms} feedback={errors.agreeTerms} feedbackType="invalid"/>
                  <div className="BotmBtn">
                    <Button onClick={handleNextStep}><Icon icon="carbon:checkmark-filled" width="24" height="24" /> Sign Up </Button>
                    <p>Already have an account? <Link href="/Auth/Login">Login</Link></p>
                  </div>
                </Form>
              </div>
            )}


              {/* Step 2 */}
            {step === 2 && (
              <div className="VerifyCodeDiv">
                <div className="VerifyText">
                  <div className="vryfytextinner">
                    <h2>Verify Code</h2>
                    <p>Enter the code we just sent to your email to proceed with verification.</p>
                  </div>
                  {/* <Form.Control type="text" name="authCode" value={formData.authCode}
                  onChange={handleInputChange}
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="text-center fs-4 mb-3"
                  isInvalid={!!errors.authCode}/>
                  <Form.Control.Feedback type="invalid">
                      {errors.authCode}
                  </Form.Control.Feedback> */}

                  <div className="otpcontdiv">
                    <div className="otp-container">
                      {otp.map((data, index) => (
                        <Form.Control
                          key={index}
                          type="text"
                          maxLength={1}
                          value={data}
                          onChange={(e) => {
                            handleChange(e.target, index);

                            // clear error on typing
                            if (errors.twofaCode) {
                              setErrors((prev) => ({ ...prev, twofaCode: "" }));
                            }
                          }}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          ref={(el) => {
                            inputsRef.current[index] = el;
                          }}
                          className="otp-input"
                        />
                      ))}
                    </div>
                    {/* ✅ Only error message, no input red border */}
                      {errors.twofaCode && (
                        <div className="text-danger text-center mt-2">
                          {errors.twofaCode}
                        </div>
                    )}
                  </div>



                </div>

                <div className="verybotm">
                  <Button onClick={handleNextStep}>Verify & Complete</Button>
                  <Button className="unfill" onClick={goBack}> Back <Icon icon="solar:round-alt-arrow-left-outline" width="24" height="24" /></Button>
                  <Button onClick={sendAuthCode}>Resend Code</Button>
                </div>

              </div>
            )}

            {/* Step 3*/}
            {step === 3 && (
            <div className="VerifyCodeDiv">
              <div className="vryfytextinner">
                <h2>Scan the QR Code</h2>
                <p>Use the Google Authenticator App to Scan the QR Code. This will connect the Authenticator with app</p>
                <p>After you scan the code,  choose “Next”</p>
              </div>

              {qrCode && <Image src={qrCode} alt="QR Code" width={160} height={160} className=" w-100" />}

              <div className="verybotm scanbtn">
                <Button className="unfill" onClick={goBack}> Back <Icon icon="solar:round-alt-arrow-left-outline" width="24" height="24" /></Button>
                <Button onClick={handleNextStep}> Next <Icon icon="solar:round-alt-arrow-right-outline" width="24" height="24" /></Button>
              </div>

            </div>
          )}


            {/* Step 4 */}
            {step === 4 && (
              <div className="VerifyCodeDiv">

                <div className="VerifyText">
                  <div className="vryfytextinner">
                    <h2>Verify Code</h2>
                    <p>Enter the code we just sent to your Authenticator App to proceed with your profile</p>
                  </div>
                  <Smartphone className="text-primary ms-2" />
                  <Form.Control
                      type="text"
                      name="twofaCode"
                      value={formData.twofaCode}
                      onChange={handleInputChange}
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      className="text-center fs-4 mb-3"
                      isInvalid={!!errors.twofaCode}
                    />
                  <Form.Control.Feedback type="invalid">
                    {errors.twofaCode}
                  </Form.Control.Feedback>
                </div>

                <div className="verybotm">
                  <Button onClick={handleNextStep}>Verify Code</Button>
                  <Button className="unfill" onClick={goBack}> Back <Icon icon="solar:round-alt-arrow-left-outline" width="24" height="24" /></Button>
                </div>

              </div>
            )}


          </div>

        </div>
    </section>
    </>
  );
};

export default Signup;

"use client";
import React, { useState } from "react";
import "../Auth.css"
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import CustomToast from "../../Components/Toasts/CustomToast";
import { MailCheck, Lock, Check, ShieldCheck, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Container, Row, Col, Button, Form, FloatingLabel } from "react-bootstrap";

import axios from "axios";
import Header from "@/app/Components/Header/Header";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";

export default function Login() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [secret, setSecret] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);



  const [errors, setErrors] = useState({
    email: "",
    password: "",
    twofaCode: "",
  });

  const handleLogin = async () => {
    const newErrors: any = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Simulated backend fetch (replace with real logic to get stored 2FA secret)
    //const response = await fetch(`/api/2fa/generate?email=${encodeURIComponent(email)}`);
    //const data = await response.json();
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/signin`, {
        email: email,
        password: password,
      });

      if (res.data.success) {
        setSecret(res.data.twoFASecret);
        setStep(2);

        
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

    // if (data && data.base32) {
    //   setSecret(data.base32);
    //   setStep(2);
    //   toast.info("Enter the 2FA code from your Authenticator App.");
    // } else {
    //   toast.error("Invalid login or failed to fetch 2FA secret.");
    // }
  };

  const handleVerify2FA = async () => {
    if (!twofaCode) {
      setErrors(prev => ({ ...prev, twofaCode: "2FA code is required" }));
      return;
    }

  

     try {
    //   const res = await fetch("/api/2fa/verify", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ token: twofaCode, secret }),
    //   });

    //   const data = await res.json();

    //   if (data.success) {
    //     localStorage.setItem("token", "mockToken123");
    //     toast.success("Login successful!");
    //     router.push("/AdminDashboard");
    //   } else {
    //     //toast.error("Invalid 2FA code.");
    //     setErrors(prev => ({ ...prev, twofaCode: "Invalid 2FA code." }));
    //     return;
    //   }

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/2fa/verify`, {
        token: twofaCode,
        secret: secret,
        email: email,
      });

      if (res.data.success) {
        //toast.success("2FA Verified");
        toast(
          <CustomToast
            title="Success!"
            message="2FA Verified."
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

    } catch (err) {
      //toast.error("2FA verification failed.");
      toast(
              <CustomToast
                title="Error!"
                message={"2FA verification failed."}
                type="error"
              />,
              { className: "toast-error" }
            );
    }
  };

  const goBack = () => {
    setStep(1);
    setTwofaCode("");
    setErrors({ email: "", password: "", twofaCode: "" });
  };

  const getStepImage = () => {
    return `/Images/signup-step${step}.png`;
  };

  const [isFocused, setIsFocused] = useState(false);

  return (
    <>
    <Header/>
    <section className="SignSection">
        <div className="SignData">
          {/* Left Image Block */}
          <div className="LeftSign" style={{ backgroundImage: `url(${getStepImage()})`, backgroundSize: "cover", backgroundPosition: "center",}} ></div>

          {/* Right Login Form */}
          <div className="RightSign">

            {/* Step 1: Email + Password */}
            {step === 1 && (
              <div className="SignInForm">
                <Form>
                  <div className="TopSign">
                    <h2>Log In now </h2>
                    <Form.Group className="SignInpt">
                      <Form.Control
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          
                          if (errors.email) {
                            setErrors((prev) => ({
                              ...prev,
                              email: "",
                            }));
                          }
                        }}
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
                      value={password}
                      
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: "",
                          }));
                        }
                      }}
                      isInvalid={!!errors.password}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                    <span onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </span>
                    </Form.Group>
                    <div className="forgt">
                      <Link href="/Auth/ForgotPassword"> Forgot Password?</Link>
                    </div>
                  </div>
                  <div className="BotmBtn">
                    <Button onClick={handleLogin}> <Icon icon="carbon:checkmark-filled" width="24" height="24" /> Log In  </Button>
                    <p>Don't have an account? <Link href="/Auth/Signup">Sign up.</Link></p>
                  </div>  
                </Form>
              </div>
            )}

            {/* Step 2: 2FA Code */}
            {step === 2 && (
              <Form>
                <div className="VerifyCodeDiv">
                  <div className="VerifyText">
                    <div className="vryfytextinner">
                      <h2>Verify Code</h2>
                      <p>Enter the code we just sent to your Authenticator App to proceed with your profile</p>
                    </div>
                    <Form.Control type="text" maxLength={6} placeholder="123456" value={twofaCode}  onChange={(e) => { setTwofaCode(e.target.value); if (errors.twofaCode) {setErrors((prev) => ({ ...prev, twofaCode: "", })); } }} isInvalid={!!errors.twofaCode} />
                    <Form.Control.Feedback type="invalid"> {errors.twofaCode}  </Form.Control.Feedback>
                  </div>
                  <div className="verybotm">
                    <Button onClick={handleVerify2FA}>Verify & Login </Button>
                    <Button className="unfill" onClick={goBack}> Back <Icon icon="solar:round-alt-arrow-left-outline" width="24" height="24" /></Button>
                     <p>Didn’t receive the code? <Link href="">Request New Code.</Link></p>
                  </div>
                </div>
              </Form>
            )}

          </div>
        </div>
    </section>
    </>
  );
}

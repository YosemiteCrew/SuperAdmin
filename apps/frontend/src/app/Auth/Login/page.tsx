'use client'
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (email && password) {
      localStorage.setItem("token", "mockToken123"); // Replace with real token logic
      router.push("/Pages/AdminDashboard");
    } else {
      alert("Enter email & password");
    }
  };

  return (
    <div className="container mt-5">
      <h2>Login</h2>
      <input className="form-control mb-2" placeholder="Email" onChange={e => setEmail(e.target.value)} />
      <input className="form-control mb-2" placeholder="Password" type="password" onChange={e => setPassword(e.target.value)} />
      <button className="btn btn-primary" onClick={handleLogin}>Login</button>
      <p>Don't have an account? <a href="/Auth/Signup">Signup</a></p>
    </div>
  );
}

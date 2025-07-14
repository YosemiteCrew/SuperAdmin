// import AdminDashboard from "./Pages/AdminDashboard/page";

// export default function Home() {
//   return (
//     <>
//     <AdminDashboard/>
//     </>
//   );
// }

'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/Pages/AdminDashboard');
    } else {
      router.push('/Auth/Login');
    }
  }, []);

  return <p>Redirecting...</p>;
}


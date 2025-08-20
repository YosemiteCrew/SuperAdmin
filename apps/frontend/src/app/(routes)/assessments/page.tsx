"use client";
import dynamic from 'next/dynamic'
import React from 'react'

const AssessmentsPage = dynamic(
  () => import('@/app/Pages/ContentManagement/Assessments/AssessmentsPage'),
  {
    loading: () => (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    ),
    ssr: false
  }
)

function page() {
  return <AssessmentsPage />
}

export default page
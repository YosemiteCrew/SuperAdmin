"use client";
import React, { useState, useEffect } from 'react'
import ViewAssessmentPage from '@/app/Pages/ContentManagement/Assessments/ViewAssessmentPage'

function Page({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        setId(resolvedParams.id);
      } catch (error) {
        console.error('Error resolving params:', error);
      } finally {
        setLoading(false);
      }
    };

    resolveParams();
  }, [params]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!id) {
    return <div>Error loading page</div>;
  }

  return <ViewAssessmentPage assessmentId={id} />;
}

export default Page 
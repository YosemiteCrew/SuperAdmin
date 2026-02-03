import BusinessDetailsPage from '@/app/Pages/BusinessDetails/BusinessDetailsPage'
import React from 'react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return (
    <>
      <BusinessDetailsPage businessId={id} />
    </>
  )
}
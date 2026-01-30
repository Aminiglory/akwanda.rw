import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import StandardizedReceipt from '../components/StandardizedReceipt';

export default function Receipt() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isDirect = searchParams.get('direct') === 'true';

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <StandardizedReceipt 
        bookingId={id} 
        isDirect={isDirect}
        userType="guest"
        showActions={true}
        compact={false}
      />
    </div>
  );
}

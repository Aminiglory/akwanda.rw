import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import StandardizedInvoice from '../components/StandardizedInvoice';

const Invoice = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isDirect = searchParams.get('direct') === 'true';

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <StandardizedInvoice 
        bookingId={id} 
        isDirect={isDirect}
        userType="guest"
        showActions={true}
        compact={false}
      />
    </div>
  );
};

export default Invoice;

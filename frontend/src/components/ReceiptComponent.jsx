import React from 'react';
import StandardizedReceipt from './StandardizedReceipt';

const ReceiptComponent = ({ bookingId, userType }) => {
  return (
    <StandardizedReceipt 
      bookingId={bookingId}
      userType={userType || 'guest'}
      isDirect={false}
      showActions={true}
      compact={true}
    />
  );
};

export default ReceiptComponent;

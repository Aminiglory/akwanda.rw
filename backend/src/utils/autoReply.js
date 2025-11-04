// Auto-reply system for common questions about properties
// These are templates that will be populated with actual property data
const autoReplyTemplates = [
  {
    keywords: ['available', 'availability', 'free', 'vacant', 'book'],
    generateResponse: (property) => {
      return `Thank you for your interest in ${property.title}! 🏠 This property is currently available for booking. You can check real-time availability and book instantly through our platform. I'll get back to you shortly with more details!`;
    }
  },
  {
    keywords: ['price', 'cost', 'rate', 'how much', 'pricing', 'fee'],
    generateResponse: (property) => {
      const price = property.pricePerNight ? `RWF ${property.pricePerNight.toLocaleString()}/night` : 'available on request';
      return `Thanks for asking! 💰 Our rate for ${property.title} is ${price}. Rates may vary by season and length of stay. For special rates or long-term stays, I'll respond with a custom quote soon!`;
    }
  },
  {
    keywords: ['check in', 'check-in', 'checkin', 'arrival', 'check out', 'checkout'],
    generateResponse: (property) => {
      const checkIn = property.checkInTime || '2:00 PM';
      const checkOut = property.checkOutTime || '11:00 AM';
      const flexibleText = property.flexibleCheckIn ? ' Flexible timing is available!' : '';
      return `Check-in is from ${checkIn} and check-out by ${checkOut}. ⏰${flexibleText} I'll confirm the exact details for your dates shortly!`;
    }
  },
  {
    keywords: ['amenities', 'facilities', 'wifi', 'parking', 'pool', 'gym', 'breakfast'],
    generateResponse: (property) => {
      const amenities = property.amenities && property.amenities.length > 0 
        ? property.amenities.slice(0, 5).map(a => a.replace(/_/g, ' ')).join(', ')
        : 'various amenities';
      const hasMore = property.amenities && property.amenities.length > 5 ? ` and ${property.amenities.length - 5} more` : '';
      return `Great question! 🎯 ${property.title} offers: ${amenities}${hasMore}. I'll provide complete details about what's included soon!`;
    }
  },
  {
    keywords: ['location', 'address', 'where', 'directions', 'nearby', 'close to'],
    generateResponse: (property) => {
      const location = `${property.city}, ${property.country}`;
      const address = property.address ? ` at ${property.address}` : '';
      return `Our property is located in ${location}${address}! 📍 I'll share more local tips, directions, and nearby attractions with you shortly!`;
    }
  },
  {
    keywords: ['cancel', 'cancellation', 'refund', 'policy'],
    generateResponse: (property) => {
      const policy = property.cancellationPolicy || 'Free cancellation up to 48 hours before check-in';
      return `Our cancellation policy: ${policy}. 📋 I'll clarify the specific policy for your booking and any applicable refund terms soon!`;
    }
  },
  {
    keywords: ['pet', 'dog', 'cat', 'animal'],
    generateResponse: (property) => {
      const petPolicy = property.petsAllowed ? 'Yes, pets are welcome! 🐾' : 'Unfortunately, pets are not allowed at this property.';
      const details = property.petPolicy ? ` ${property.petPolicy}` : '';
      return `Thanks for asking! ${petPolicy}${details} I'll get back to you with specific details if you have any questions!`;
    }
  },
  {
    keywords: ['room', 'bedroom', 'bed', 'sleep', 'guest', 'people'],
    generateResponse: (property) => {
      const bedrooms = property.bedrooms || 'multiple';
      const maxGuests = property.maxGuests || property.capacity || 'several';
      const rooms = property.rooms && property.rooms.length > 0 ? ` We have ${property.rooms.length} room types available.` : '';
      return `${property.title} has ${bedrooms} bedroom(s) and can accommodate up to ${maxGuests} guests! 🛏️${rooms} I'll help you find the perfect room for your group!`;
    }
  },
  {
    keywords: ['rule', 'rules', 'policy', 'policies', 'allowed', 'not allowed'],
    generateResponse: (property) => {
      if (property.roomRules && property.roomRules.length > 0) {
        const rules = property.roomRules.slice(0, 3).join(', ');
        const hasMore = property.roomRules.length > 3 ? ` and ${property.roomRules.length - 3} more rules` : '';
        return `📋 House Rules for ${property.title}: ${rules}${hasMore}. Please ensure you follow these guidelines during your stay. I'll send you the complete list shortly!`;
      }
      return `📋 I'll send you our complete house rules shortly. These help ensure a pleasant stay for all guests!`;
    }
  },
  {
    keywords: ['payment', 'pay', 'deposit', 'credit card', 'cash'],
    generateResponse: (property) => {
      return `We accept secure online payments through our platform. 💳 A deposit may be required for ${property.title}. I'll send you complete payment details and booking confirmation shortly!`;
    }
  }
];

/**
 * Check if a message matches any auto-reply keywords and return appropriate response
 * @param {string} messageText - The incoming message text
 * @param {Object} property - The property object with all details
 * @param {Object} owner - The property owner object with contact details
 * @returns {string|null} - Auto-reply text or null if no match
 */
function getAutoReply(messageText, property, owner) {
  if (!messageText || typeof messageText !== 'string') return null;
  if (!property) return null;
  
  const lowerText = messageText.toLowerCase().trim();
  
  // Don't auto-reply to very short messages (likely greetings)
  if (lowerText.length < 5) return null;
  
  // Generate contact info footer
  const contactInfo = generateContactFooter(owner);
  
  // Check each template
  for (const template of autoReplyTemplates) {
    const hasKeyword = template.keywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    
    if (hasKeyword) {
      return template.generateResponse(property) + contactInfo;
    }
  }
  
  // Default auto-reply for first-time messages with property name
  if (lowerText.length > 10) {
    return `Thanks for reaching out about ${property.title}! 👋 I've received your message and will respond as soon as possible. In the meantime, feel free to check our property details and book directly!${contactInfo}`;
  }
  
  return null;
}

/**
 * Generate contact information footer for auto-replies
 * @param {Object} owner - The property owner object
 * @returns {string} - Formatted contact information
 */
function generateContactFooter(owner) {
  if (!owner) return '';
  
  const name = owner.name || owner.firstName || 'Property Owner';
  const email = owner.email || '';
  const phone = owner.phone || owner.phoneNumber || '';
  
  let footer = '\n\n📞 For more details, you can contact me directly:\n';
  
  if (name) {
    footer += `👤 ${name}\n`;
  }
  
  if (email) {
    footer += `📧 Email: ${email}\n`;
  }
  
  if (phone) {
    footer += `📱 Phone: ${phone}`;
  }
  
  // If no contact info available, return generic message
  if (!email && !phone) {
    return '\n\n📞 I\'ll respond with my contact details shortly so we can discuss further!';
  }
  
  return footer;
}

/**
 * Check if auto-reply should be sent (avoid sending multiple auto-replies)
 * @param {Array} previousMessages - Array of previous messages in the thread
 * @param {string} senderId - ID of the message sender
 * @returns {boolean} - Whether to send auto-reply
 */
function shouldSendAutoReply(previousMessages, senderId) {
  if (!previousMessages || previousMessages.length === 0) return true;
  
  // Check if we've already sent an auto-reply in this thread
  const hasAutoReply = previousMessages.some(msg => 
    msg.isAutoReply === true || 
    (msg.metadata && msg.metadata.isAutoReply === true)
  );
  
  // Only send auto-reply if:
  // 1. No auto-reply sent yet
  // 2. This is one of the first 3 messages from the guest
  const guestMessages = previousMessages.filter(msg => 
    String(msg.sender || msg.senderId) === String(senderId)
  );
  
  return !hasAutoReply && guestMessages.length <= 2;
}

module.exports = {
  getAutoReply,
  shouldSendAutoReply,
  autoReplyTemplates
};

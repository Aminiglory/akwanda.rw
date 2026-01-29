import React, { useState, useEffect } from 'react';
import { FaHeadset, FaTicketAlt, FaPhone, FaEnvelope, FaClock, FaCheckCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomerSupport = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('contact');
  const [ownerReviews, setOwnerReviews] = useState({ reviews: [], avgRating: 0, count: 0 });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [ticketConfirmation, setTicketConfirmation] = useState(null);
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    phone: '',
    bookingId: '',
    subject: '',
    category: 'general',
    priority: 'medium',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [faqs, setFaqs] = useState([]);

  // Prefill support form from logged-in user profile
  useEffect(() => {
    if (!isAuthenticated) return;
    const fullName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    setSupportForm(prev => ({
      ...prev,
      name: fullName || prev.name,
      email: user?.email || prev.email,
      phone: user?.phone || prev.phone,
    }));
  }, [isAuthenticated, user]);

  const categories = [
    { value: 'general', label: 'General Inquiry', icon: FaInfoCircle },
    { value: 'booking', label: 'Booking Issues', icon: FaTicketAlt },
    { value: 'payment', label: 'Payment Problems', icon: FaExclamationTriangle },
    { value: 'technical', label: 'Technical Support', icon: FaHeadset },
    { value: 'refund', label: 'Refund Request', icon: FaCheckCircle }
  ];

  useEffect(() => {
    const loadReviews = async () => {
      if (activeTab !== 'reviews') return;
      if (!(user?.userType === 'host' || user?.userType === 'admin')) return;
      try {
        setLoadingReviews(true);
        const res = await fetch(`${API_URL}/api/bookings/owner/reviews`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to fetch reviews');
        setOwnerReviews({
          reviews: data.reviews || [],
          avgRating: data.avgRating || 0,
          count: data.count || 0
        });
      } catch (e) {
        toast.error(e.message || 'Failed to load reviews');
      } finally {
        setLoadingReviews(false);
      }
    };
    loadReviews();
  }, [activeTab, user]);

  // Load FAQs from CMS/content API so admin can manage them
  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const res = await fetch(`${API_URL}/api/content/landing`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) return;
        const content = json?.content || json || {};
        const sections = Array.isArray(content.sections) ? content.sections : [];
        const how = sections.find(s => s?.type === 'howItWorks' || s?.key === 'howItWorks') || content?.howItWorks;
        const items = Array.isArray(how?.faqs) ? how.faqs : [];
        setFaqs(items);
      } catch (_) {}
    };
    loadFaqs();
  }, []);

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSupportForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const normalizePhone = (v) => String(v || '').trim().replace(/[\s()-]/g, '');
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  const isValidPhone = (v) => {
    const s = normalizePhone(v);
    if (!s) return true;
    return /^\+?[0-9]{9,15}$/.test(s);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = String(supportForm.name || '').trim();
    const email = String(supportForm.email || '').trim();
    const phone = String(supportForm.phone || '').trim();
    const subject = String(supportForm.subject || '').trim();
    const message = String(supportForm.message || '').trim();

    if (!name || !email || !subject || !message) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`${API_URL}/api/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          phone: phone ? normalizePhone(phone) : '',
          bookingId: supportForm.bookingId,
          subject,
          category: supportForm.category,
          priority: supportForm.priority,
          message,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit support ticket');
      }

      setTicketConfirmation({
        ticketNumber: data.ticketNumber || data?.ticket?.ticketNumber || '',
        status: data?.ticket?.status || 'open',
        createdAt: data?.ticket?.createdAt || new Date().toISOString(),
      });
      toast.success(`Support ticket submitted${data.ticketNumber ? `: ${data.ticketNumber}` : ''}`);
      setSupportForm({
        name: '',
        email: '',
        phone: '',
        bookingId: '',
        subject: '',
        category: 'general',
        priority: 'medium',
        message: ''
      });
    } catch (error) {
      toast.error(error.message || 'Failed to submit support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaHeadset className="text-3xl text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Customer Support</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're here to help! Get assistance with your bookings, payments, or any questions you may have.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 px-4 sm:px-6 overflow-x-auto no-scrollbar whitespace-nowrap">
              {[
                { id: 'contact', label: 'Contact Us', icon: FaPhone },
                { id: 'ticket', label: 'Submit Ticket', icon: FaTicketAlt },
                ...(user?.userType === 'host' || user?.userType === 'admin' ? [{ id: 'reviews', label: 'Reviews', icon: FaCheckCircle }] : []),
                ...(user?.userType === 'admin' ? [{ id: 'admin', label: 'Admin Tools', icon: FaHeadset }] : []),
                { id: 'faq', label: 'FAQ', icon: FaInfoCircle }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-4 px-2 sm:px-3 border-b-2 font-medium text-sm transition-colors duration-300 flex items-center gap-2 shrink-0 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-8">
            {/* Contact Us Tab */}
            {activeTab === 'contact' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FaPhone className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
                        <p className="text-gray-600 mb-2">Call us for immediate assistance</p>
                        <p className="text-blue-600 font-medium">+250 788 123 456</p>
                        <p className="text-sm text-gray-500">Available 24/7</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <FaEnvelope className="text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
                        <p className="text-gray-600 mb-2">Send us an email and we'll respond within 24 hours</p>
                        <p className="text-green-600 font-medium">support@akwanda.rw</p>
                        <p className="text-sm text-gray-500">Response time: 2-24 hours</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FaClock className="text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
                        <p className="text-gray-600 mb-2">Our support team is available</p>
                        <div className="text-sm text-gray-700">
                          <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                          <p>Saturday: 9:00 AM - 4:00 PM</p>
                          <p>Sunday: 10:00 AM - 2:00 PM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Contact Form</h3>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="How can we help you?"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Reviews Tab (Host/Admin) */}
            {activeTab === 'reviews' && (user?.userType === 'host' || user?.userType === 'admin') && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">Average Rating</div>
                      <div className="text-3xl font-bold text-yellow-600">{ownerReviews.avgRating.toFixed(1)} / 5</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Total Reviews</div>
                      <div className="text-3xl font-bold text-gray-900">{ownerReviews.count}</div>
                    </div>
                  </div>
                </div>
                {loadingReviews ? (
                  <div className="text-center text-gray-600 py-10">Loading reviews...</div>
                ) : ownerReviews.reviews.length === 0 ? (
                  <div className="text-center text-gray-600 py-10">No reviews yet.</div>
                ) : (
                  <div className="space-y-4">
                    {ownerReviews.reviews.map((r, idx) => (
                      <div key={idx} className="bg-white rounded-xl shadow p-5 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-900">{r.propertyTitle || 'Property'}</div>
                          <div className="text-yellow-600 font-semibold">{r.rating} / 5</div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">By {r.guest?.firstName} {r.guest?.lastName}</div>
                        <div className="text-gray-800">{r.comment || 'No comment provided.'}</div>
                        <div className="text-xs text-gray-500 mt-2">{new Date(r.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Admin Tools Tab */}
            {activeTab === 'admin' && user?.userType === 'admin' && (
              <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Support Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3">Recent Tickets</h3>
                    <p className="text-sm text-gray-600">View and manage latest support tickets.</p>
                    <a href="/admin/support/tickets" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Open Tickets</a>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3">User Reports</h3>
                    <p className="text-sm text-gray-600">See user issue reports and flagged content.</p>
                    <a href="/admin/reports" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Open Reports</a>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3">System Health</h3>
                    <p className="text-sm text-gray-600">Monitor uptime and API error rates.</p>
                    <a href="/admin/monitoring" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Open Monitoring</a>
                  </div>
                  <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-3">Knowledge Base</h3>
                    <p className="text-sm text-gray-600">Manage FAQs and canned responses.</p>
                    <a href="/admin/knowledge-base" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Open KB</a>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Ticket Tab */}
            {activeTab === 'ticket' && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Support Ticket</h2>

                {ticketConfirmation ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="text-green-800 font-semibold">Ticket submitted</div>
                    <div className="text-sm text-green-800 mt-1">Your ticket number is:</div>
                    <div className="mt-2 text-lg font-bold text-green-900">{ticketConfirmation.ticketNumber || '—'}</div>
                    <div className="mt-3 text-sm text-green-800">Status: <span className="font-semibold">{ticketConfirmation.status || 'open'}</span></div>
                    <button
                      type="button"
                      className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-green-700 hover:bg-green-800 text-white text-sm font-semibold"
                      onClick={() => setTicketConfirmation(null)}
                    >
                      Submit another ticket
                    </button>
                  </div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={supportForm.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder=""
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={supportForm.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder=""
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={supportForm.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder=""
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Booking ID (if applicable)
                      </label>
                      <input
                        type="text"
                        name="bookingId"
                        value={supportForm.bookingId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder=""
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <textarea
                      name="subject"
                      value={supportForm.subject}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder=""
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        name="category"
                        value={supportForm.category}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={supportForm.priority}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {priorities.map(pri => (
                          <option key={pri.value} value={pri.value}>{pri.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={supportForm.message}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder=""
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <FaTicketAlt />
                        Submit Support Ticket
                      </>
                    )}
                  </button>
                </form>
                )}
              </div>
            )}

            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
                
                {faqs && faqs.length > 0 ? (
                  <div className="space-y-6">
                    {faqs.map((f, i) => (
                      <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">{f.q || f.question}</h3>
                        <p className="text-gray-600">{f.a || f.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow p-6 text-gray-600">No FAQs available yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;

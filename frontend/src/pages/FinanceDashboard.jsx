import React, { useState, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import { useSearchParams } from 'react-router-dom';
import { FaDollarSign, FaFileInvoice, FaChartLine, FaCog, FaDownload, FaCalendarAlt, FaCheckCircle, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FinanceDashboard() {
  const { formatCurrencyRWF } = useLocale() || {};
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'overview';
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [loading, setLoading] = useState(false);
  const [financeData, setFinanceData] = useState({
    totalEarnings: 0,
    pendingPayments: 0,
    paidAmount: 0,
    commissionOwed: 0,
    invoices: [],
    transactions: []
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetchFinanceData();
    }
  }, [selectedProperty, view]);

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API_URL}/api/properties/my-properties`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setProperties(data.properties || []);
        if (data.properties && data.properties.length > 0) {
          setSelectedProperty(data.properties[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    }
  };

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/bookings/owner?property=${selectedProperty}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const bookings = data.bookings || [];
        
        // Calculate financial metrics
        const totalEarnings = bookings
          .filter(b => b.status === 'confirmed' || b.status === 'completed')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        const pendingPayments = bookings
          .filter(b => b.status === 'pending')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        const paidAmount = bookings
          .filter(b => b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        
        // Commission calculation (10% default)
        const commissionOwed = totalEarnings * 0.10;

        setFinanceData({
          totalEarnings,
          pendingPayments,
          paidAmount,
          commissionOwed,
          invoices: bookings.map(b => ({
            id: b._id,
            date: b.createdAt,
            amount: b.totalAmount,
            status: b.paymentStatus || 'pending',
            guestName: `${b.guest?.firstName || ''} ${b.guest?.lastName || ''}`.trim() || 'Guest'
          })),
          transactions: bookings
        });
      }
    } catch (error) {
      console.error('Failed to load finance data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (invoiceId) => {
    window.open(`${API_URL}/api/invoices/${invoiceId}/download`, '_blank');
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(financeData.totalEarnings) : `RWF ${financeData.totalEarnings.toLocaleString()}`}</p>
            </div>
            <FaDollarSign className="text-3xl text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(financeData.pendingPayments) : `RWF ${financeData.pendingPayments.toLocaleString()}`}</p>
            </div>
            <FaClock className="text-3xl text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(financeData.paidAmount) : `RWF ${financeData.paidAmount.toLocaleString()}`}</p>
            </div>
            <FaCheckCircle className="text-3xl text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Commission Owed</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrencyRWF ? formatCurrencyRWF(financeData.commissionOwed) : `RWF ${financeData.commissionOwed.toLocaleString()}`}</p>
            </div>
            <FaChartLine className="text-3xl text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {financeData.transactions.slice(0, 10).map((transaction) => (
                <tr key={transaction._id}>
                  <td className="px-4 py-3 text-sm">{new Date(transaction.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{`${transaction.guest?.firstName || ''} ${transaction.guest?.lastName || ''}`.trim() || 'Guest'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{formatCurrencyRWF ? formatCurrencyRWF(transaction.totalAmount || 0) : `RWF ${(transaction.totalAmount || 0).toLocaleString()}`}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      transaction.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      transaction.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.paymentStatus || 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInvoices = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Invoices</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <FaDownload className="inline mr-2" />
          Download All
        </button>
      </div>
      <div className="space-y-4">
        {financeData.invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <FaFileInvoice className="text-2xl text-blue-600" />
              <div>
                <p className="font-medium">{invoice.guestName}</p>
                <p className="text-sm text-gray-600">{new Date(invoice.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <p className="font-bold">{formatCurrencyRWF ? formatCurrencyRWF(invoice.amount || 0) : `RWF ${(invoice.amount || 0).toLocaleString()}`}</p>
              <span className={`px-3 py-1 rounded-full text-xs ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status}
              </span>
              <button
                onClick={() => downloadInvoice(invoice.id)}
                className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                <FaDownload />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatement = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-6">Reservations Statement</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Total Reservations</p>
            <p className="text-xl font-bold">{financeData.transactions.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-xl font-bold">{formatCurrencyRWF ? formatCurrencyRWF(financeData.totalEarnings) : `RWF ${financeData.totalEarnings.toLocaleString()}`}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Commission (10%)</p>
            <p className="text-xl font-bold text-red-600">{formatCurrencyRWF ? formatCurrencyRWF(financeData.commissionOwed) : `RWF ${financeData.commissionOwed.toLocaleString()}`}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Earnings</p>
            <p className="text-xl font-bold text-green-600">{formatCurrencyRWF ? formatCurrencyRWF(financeData.totalEarnings - financeData.commissionOwed) : `RWF ${(financeData.totalEarnings - financeData.commissionOwed).toLocaleString()}`}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-6">Finance Settings</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
          <select className="w-full px-4 py-2 border rounded-lg">
            <option>Bank Transfer</option>
            <option>Mobile Money</option>
            <option>PayPal</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account</label>
          <input type="text" placeholder="Enter account number" className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID</label>
          <input type="text" placeholder="Enter tax ID" className="w-full px-4 py-2 border rounded-lg" />
        </div>
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Save Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Dashboard</h1>
          <p className="text-gray-600">Manage your earnings, invoices, and financial settings</p>
        </div>

        {/* Property Selector */}
        {properties.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Property</label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border rounded-lg"
            >
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* View Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <a
              href="?view=overview"
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                view === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </a>
            <a
              href="?view=invoices"
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                view === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices
            </a>
            <a
              href="?view=statement"
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                view === 'statement'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statement
            </a>
            <a
              href="?view=settings"
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                view === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </a>
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading financial data...</p>
          </div>
        ) : (
          <>
            {view === 'overview' && renderOverview()}
            {view === 'invoices' && renderInvoices()}
            {view === 'statement' && renderStatement()}
            {view === 'settings' && renderSettings()}
          </>
        )}
      </div>
    </div>
  );
}

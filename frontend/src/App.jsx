import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { Toaster } from 'react-hot-toast'
import { ProtectedRoute, AdminRoute, HostRoute } from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import Footer from './components/Footer'
import Home from './pages/Home'
import ApartmentsListing from './pages/ApartmentsListing'
import Flights from './pages/Flights'
import Attractions from './pages/Attractions'
import AttractionDetail from './pages/AttractionDetail'
import AirportTaxis from './pages/AirportTaxis'
import ApartmentDetails from './pages/ApartmentDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import OwnerRegister from './pages/OwnerRegister'
import BecomeHost from './pages/BecomeHost'
import OwnerLogin from './pages/OwnerLogin'
import Dashboard from './pages/Dashboard'
import UploadProperty from './pages/UploadProperty'
import EnhancedUploadProperty from './pages/EnhancedUploadProperty'
import AdminDashboard from './pages/AdminDashboard'
import AdminLanding from './pages/AdminLanding'
import AdminAttractions from './pages/AdminAttractions'
import CarsList from './pages/CarsList'
import CarDetail from './pages/CarDetail'
import CarOwnerDashboard from './pages/CarOwnerDashboard'
import OwnerAttractionsDashboard from './pages/OwnerAttractionsDashboard'
import AdminProfile from './pages/AdminProfile'
import UserProfile from './pages/UserProfile'
import Settings from './pages/Settings'
import MTNMobileMoneyPayment from './pages/MTNMobileMoneyPayment'
import PayCommission from './pages/PayCommission'
import RRAEBMIntegration from './pages/RRAEBMIntegration'
import BookingProcess from './pages/BookingProcess'
import BookingConfirmation from './pages/BookingConfirmation'
import CustomerSupport from './pages/CustomerSupport'
import PropertyOwnerBookings from './pages/PropertyOwnerBookings'
// Removed EnhancedPropertyOwnerDashboard (deprecated)
import Messages from './pages/Messages'
import OwnerPromotions from './pages/OwnerPromotions'
import WorkersManagement from './pages/WorkersManagement'
import OwnerReviews from './pages/OwnerReviews'
import Homes from './pages/Homes'
import Experiences from './pages/Experiences'
import Deals from './pages/Deals'
import DealsPage from './pages/DealsPage'
import TestDeals from './pages/TestDeals'
import DirectBooking from './pages/DirectBooking'
import Invoice from './pages/Invoice'
import Receipt from './pages/Receipt'
import Notifications from './pages/Notifications'
import TestUpload from './pages/TestUpload'
import QuickLogin from './pages/QuickLogin'
import AdminUserManagement from './pages/AdminUserManagement'
import AdminReports from './pages/AdminReports'
import EditProperty from './pages/EditProperty'
import Favorites from './pages/Favorites'
import LogoutSuccess from './pages/LogoutSuccess'
import BookingSuccess from './pages/BookingSuccess'
import PaymentSuccess from './pages/PaymentSuccess'

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time for smooth animations
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          {/* Logo / Brand */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center ring-1 ring-blue-100">
            <span className="text-blue-700 font-extrabold text-xl">AK</span>
          </div>
          {/* Orbit loader */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rounded-full shadow"></div>
          </div>
          <p className="text-sm text-gray-600">Preparing your experience…</p>
          <div className="mt-3 flex items-center justify-center gap-1">
            <span className="w-2 h-2 bg-blue-500/60 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
            <span className="w-2 h-2 bg-blue-500/60 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-blue-500/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <ErrorBoundary>
            <div className="min-h-screen bg-gray-50">
              <Toaster position="top-right" />
              {/* Header */}
              <Navbar />
            {/* commit routes */}
            {/* Main Content */}
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apartments" element={<ProtectedRoute><ApartmentsListing /></ProtectedRoute>} />
            <Route path="/homes" element={<Homes />} />
            <Route path="/experiences" element={<Experiences />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/deals-old" element={<Deals />} />
            <Route path="/test-deals" element={<TestDeals />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/attractions" element={<Attractions />} />
            <Route path="/attractions/:id" element={<AttractionDetail />} />
            <Route path="/cars" element={<CarsList />} />
            <Route path="/cars/:id" element={<CarDetail />} />
            <Route path="/taxis" element={<AirportTaxis />} />
            <Route path="/apartment/:id" element={<ApartmentDetails />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/logout-success" element={<LogoutSuccess />} />
            <Route path="/booking-success" element={<BookingSuccess />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/billing/pay-commission" element={<ProtectedRoute><PayCommission /></ProtectedRoute>} />
            <Route path="/edit-property/:id" element={<ProtectedRoute><EditProperty /></ProtectedRoute>} />
            <Route path="/booking/:id" element={<BookingProcess />} />
            <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/owner-login" element={<OwnerLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/owner-register" element={<OwnerRegister />} />
            <Route path="/become-host" element={<ProtectedRoute><BecomeHost /></ProtectedRoute>} />
            <Route path="/dashboard" element={<HostRoute><div className="dashboard"><PropertyOwnerBookings /></div></HostRoute>} />
            <Route path="/user-dashboard" element={<HostRoute><div className="dashboard"><PropertyOwnerBookings /></div></HostRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/upload" element={<HostRoute><EnhancedUploadProperty /></HostRoute>} />
            <Route path="/upload-property" element={<HostRoute><EnhancedUploadProperty /></HostRoute>} />
            <Route path="/upload-legacy" element={<HostRoute><UploadProperty /></HostRoute>} />
            <Route path="/admin" element={<AdminRoute><div className="dashboard"><AdminDashboard /></div></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><div className="dashboard"><AdminProfile /></div></AdminRoute>} />
            <Route path="/admin/landing" element={<AdminRoute><div className="dashboard"><AdminLanding /></div></AdminRoute>} />
            <Route path="/admin/attractions" element={<AdminRoute><div className="dashboard"><AdminAttractions /></div></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><div className="dashboard"><AdminUserManagement /></div></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><div className="dashboard"><AdminReports /></div></AdminRoute>} />
            <Route path="/mtn-payment" element={<ProtectedRoute><MTNMobileMoneyPayment /></ProtectedRoute>} />
            <Route path="/payment/mtn-mobile-money" element={<MTNMobileMoneyPayment />} />
            <Route path="/billing/rra-ebm" element={<RRAEBMIntegration />} />
            <Route path="/support" element={<CustomerSupport />} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<HostRoute><div className="dashboard"><PropertyOwnerBookings /></div></HostRoute>} />
            {/* All property owner dashboard routes now point to PropertyOwnerBookings */}
            <Route path="/owner/cars" element={<HostRoute><div className="dashboard"><CarOwnerDashboard /></div></HostRoute>} />
            <Route path="/owner/attractions" element={<HostRoute><div className="dashboard"><OwnerAttractionsDashboard /></div></HostRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/owner/promotions" element={<HostRoute><div className="dashboard"><OwnerPromotions /></div></HostRoute>} />
            <Route path="/owner/reviews" element={<HostRoute><div className="dashboard"><OwnerReviews /></div></HostRoute>} />
            <Route path="/owner/direct-booking" element={<HostRoute><DirectBooking /></HostRoute>} />
            <Route path="/owner/workers" element={<HostRoute><div className="dashboard"><WorkersManagement /></div></HostRoute>} />
            <Route path="/invoice/:id" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
            <Route path="/receipt/:id" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
            <Route path="/test-upload" element={<TestUpload />} />
            <Route path="/quick-login" element={<QuickLogin />} />
            </Routes>
            
            {/* Footer - Hidden on messages, profile, auth pages */}
            <Routes>
              <Route path="/messages" element={null} />
              <Route path="/profile" element={null} />
              <Route path="/login" element={null} />
              <Route path="/register" element={null} />
              <Route path="/quick-login" element={null} />
              <Route path="*" element={<Footer />} />
            </Routes>
            </div>
          </ErrorBoundary>
        </Router>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App

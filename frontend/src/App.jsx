import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import ApartmentsListing from './pages/ApartmentsListing'
import Flights from './pages/Flights'
import Attractions from './pages/Attractions'
import AirportTaxis from './pages/AirportTaxis'
import ApartmentDetails from './pages/ApartmentDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import UserDashboard from './pages/UserDashboard'
import UploadProperty from './pages/UploadProperty'
import EnhancedUploadProperty from './pages/EnhancedUploadProperty'
import AdminDashboard from './pages/AdminDashboard'
import AdminLanding from './pages/AdminLanding'
import AdminAttractions from './pages/AdminAttractions'
import CarsList from './pages/CarsList'
import CarDetail from './pages/CarDetail'
import CarOwnerDashboard from './pages/CarOwnerDashboard'
import AdminProfile from './pages/AdminProfile'
import MTNMobileMoneyPayment from './pages/MTNMobileMoneyPayment'
import RRAEBMIntegration from './pages/RRAEBMIntegration'
import BookingProcess from './pages/BookingProcess'
import BookingConfirmation from './pages/BookingConfirmation'
import CustomerSupport from './pages/CustomerSupport'
import PropertyOwnerBookings from './pages/PropertyOwnerBookings'
// Removed EnhancedPropertyOwnerDashboard (deprecated)
import Messages from './pages/Messages'

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
      <div className="w-full h-screen bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg animate-pulse">Loading AKWANDA.rw...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          {/* Header */}
          <Navbar />
          
          {/* Main Content */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apartments" element={<ProtectedRoute><ApartmentsListing /></ProtectedRoute>} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/attractions" element={<Attractions />} />
            <Route path="/cars" element={<CarsList />} />
            <Route path="/cars/:id" element={<CarDetail />} />
            <Route path="/taxis" element={<AirportTaxis />} />
            <Route path="/apartment/:id" element={<ApartmentDetails />} />
            <Route path="/booking/:id" element={<BookingProcess />} />
            <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/user-dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><EnhancedUploadProperty /></ProtectedRoute>} />
            <Route path="/upload-legacy" element={<ProtectedRoute><UploadProperty /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
            <Route path="/admin/landing" element={<AdminRoute><AdminLanding /></AdminRoute>} />
            <Route path="/admin/attractions" element={<AdminRoute><AdminAttractions /></AdminRoute>} />
            <Route path="/mtn-payment" element={<ProtectedRoute><MTNMobileMoneyPayment /></ProtectedRoute>} />
            <Route path="/payment/mtn-mobile-money" element={<MTNMobileMoneyPayment />} />
            <Route path="/billing/rra-ebm" element={<RRAEBMIntegration />} />
            <Route path="/support" element={<CustomerSupport />} />
            <Route path="/my-bookings" element={<ProtectedRoute><PropertyOwnerBookings /></ProtectedRoute>} />
            {/* Removed /owner-dashboard route; use /my-bookings */}
            <Route path="/owner/cars" element={<ProtectedRoute><CarOwnerDashboard /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          </Routes>
          
          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

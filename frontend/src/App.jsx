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
import UploadProperty from './pages/UploadProperty'
import AdminDashboard from './pages/AdminDashboard'
import AdminProfile from './pages/AdminProfile'

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
            <Route path="/taxis" element={<AirportTaxis />} />
            <Route path="/apartment/:id" element={<ApartmentDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadProperty /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><AdminProfile /></AdminRoute>} />
          </Routes>
          
          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

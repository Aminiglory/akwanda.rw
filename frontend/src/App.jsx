import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LocaleProvider } from './contexts/LocaleContext'
import { SocketProvider } from './contexts/SocketContext'
import { Toaster } from 'react-hot-toast'
import { ProtectedRoute, AdminRoute, HostRoute } from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Footer from './components/Footer'

const Navbar = lazy(() => import('./components/Navbar'));

const Home = lazy(() => import('./pages/Home'));
const ApartmentsListing = lazy(() => import('./pages/ApartmentsListing'));
const SettingsSection = lazy(() => import('./pages/SettingsSection'));
const Flights = lazy(() => import('./pages/Flights'));
const Attractions = lazy(() => import('./pages/Attractions'));
const AttractionDetail = lazy(() => import('./pages/AttractionDetail'));
const AirportTaxis = lazy(() => import('./pages/AirportTaxis'));
const ApartmentDetails = lazy(() => import('./pages/ApartmentDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const OwnerRegister = lazy(() => import('./pages/OwnerRegister'));
const BecomeHost = lazy(() => import('./pages/BecomeHost'));
const OwnerLogin = lazy(() => import('./pages/OwnerLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UploadProperty = lazy(() => import('./pages/UploadProperty'));
const EnhancedUploadProperty = lazy(() => import('./pages/EnhancedUploadProperty'));
const ListProperty = lazy(() => import('./pages/ListProperty'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLanding = lazy(() => import('./pages/AdminLanding'));
const AdminAttractions = lazy(() => import('./pages/AdminAttractions'));
const AdminAmenities = lazy(() => import('./pages/AdminAmenities'));
const CarsList = lazy(() => import('./pages/CarsList'));
const CarDetail = lazy(() => import('./pages/CarDetail'));
const CarOwnerDashboard = lazy(() => import('./pages/CarOwnerDashboard'));
const OwnerAttractionsDashboard = lazy(() => import('./pages/OwnerAttractionsDashboard'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const MTNMobileMoneyPayment = lazy(() => import('./pages/MTNMobileMoneyPayment'));
const PayCommission = lazy(() => import('./pages/PayCommission'));
const RRAEBMIntegration = lazy(() => import('./pages/RRAEBMIntegration'));
const BookingProcess = lazy(() => import('./pages/BookingProcess'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const CustomerSupport = lazy(() => import('./pages/CustomerSupport'));
const PropertyOwnerBookings = lazy(() => import('./pages/PropertyOwnerBookings'));
const Messages = lazy(() => import('./pages/Messages'));
const OwnerPromotions = lazy(() => import('./pages/OwnerPromotions'));
const WorkersManagement = lazy(() => import('./pages/WorkersManagement'));
const OwnerReviews = lazy(() => import('./pages/OwnerReviews'));
const RatesAvailability = lazy(() => import('./pages/RatesAvailability'));
const PropertyManagement = lazy(() => import('./pages/PropertyManagement'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const BoostPerformance = lazy(() => import('./pages/BoostPerformance'));
const Homes = lazy(() => import('./pages/Homes'));
const Experiences = lazy(() => import('./pages/Experiences'));
const Deals = lazy(() => import('./pages/Deals'));
const DealsPage = lazy(() => import('./pages/DealsPage'));
const TestDeals = lazy(() => import('./pages/TestDeals'));
const DirectBooking = lazy(() => import('./pages/DirectBooking'));
const Invoice = lazy(() => import('./pages/Invoice'));
const Receipt = lazy(() => import('./pages/Receipt'));
const Notifications = lazy(() => import('./pages/Notifications'));
const TestUpload = lazy(() => import('./pages/TestUpload'));
const QuickLogin = lazy(() => import('./pages/QuickLogin'));
const AdminUserManagement = lazy(() => import('./pages/AdminUserManagement'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const EditProperty = lazy(() => import('./pages/EditProperty'));
const Favorites = lazy(() => import('./pages/Favorites'));
const LogoutSuccess = lazy(() => import('./pages/LogoutSuccess'));
const BookingSuccess = lazy(() => import('./pages/BookingSuccess'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const Transactions = lazy(() => import('./pages/Transactions'));

function App() {
  console.debug('[AK] App render start')
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

  const AppShell = () => {
    const { user, isAuthenticated } = useAuth();
    return (
      <SocketProvider user={user} isAuthenticated={isAuthenticated}>
        <Router>
          <ErrorBoundary>
            <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            {/* Header */}
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            {/* commit routes */}
            {/* Main Content */}
            <Suspense fallback={null}>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apartments" element={<ApartmentsListing />} />
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
            <Route path="/booking/:id" element={<ProtectedRoute><BookingProcess /></ProtectedRoute>} />
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
            <Route path="/account/:section" element={<ProtectedRoute><SettingsSection /></ProtectedRoute>} />
            <Route path="/list-property" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<HostRoute><EnhancedUploadProperty /></HostRoute>} />
            <Route path="/upload-property" element={<HostRoute><EnhancedUploadProperty /></HostRoute>} />
            <Route path="/upload-legacy" element={<HostRoute><UploadProperty /></HostRoute>} />
            <Route path="/admin" element={<AdminRoute><div className="dashboard"><AdminDashboard /></div></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><div className="dashboard"><AdminProfile /></div></AdminRoute>} />
            <Route path="/admin/landing" element={<AdminRoute><div className="dashboard"><AdminLanding /></div></AdminRoute>} />
            <Route path="/admin/attractions" element={<AdminRoute><div className="dashboard"><AdminAttractions /></div></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><div className="dashboard"><AdminUserManagement /></div></AdminRoute>} />
            <Route path="/admin/amenities" element={<AdminRoute><div className="dashboard"><AdminAmenities /></div></AdminRoute>} />
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
            <Route path="/owner/rates" element={<HostRoute><div className="dashboard"><RatesAvailability /></div></HostRoute>} />
            <Route path="/owner/property" element={<HostRoute><div className="dashboard"><PropertyManagement /></div></HostRoute>} />
            <Route path="/finance" element={<HostRoute><div className="dashboard"><FinanceDashboard /></div></HostRoute>} />
            <Route path="/transactions" element={<HostRoute><div className="dashboard"><Transactions /></div></HostRoute>} />
            <Route path="/analytics" element={<HostRoute><div className="dashboard"><AnalyticsDashboard /></div></HostRoute>} />
            <Route path="/boost" element={<HostRoute><div className="dashboard"><BoostPerformance /></div></HostRoute>} />
            <Route path="/invoice/:id" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
            <Route path="/receipt/:id" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
            <Route path="/test-upload" element={<TestUpload />} />
            <Route path="/quick-login" element={<QuickLogin />} />
            </Routes>
            </Suspense>
            
            {/* Footer - Hidden on messages, profile, auth pages */}
            <Suspense fallback={null}>
            <Routes>
              <Route path="/messages" element={null} />
              <Route path="/profile" element={null} />
              <Route path="/login" element={null} />
              <Route path="/register" element={null} />
              <Route path="/quick-login" element={null} />
              <Route path="*" element={<Footer />} />
            </Routes>
            </Suspense>
              </div>
            </ErrorBoundary>
          </Router>
      </SocketProvider>
    );
  };

  return (
    <LocaleProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </LocaleProvider>
  )
}

export default App

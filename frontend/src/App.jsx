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
import GlobalTranslationProvider from './components/GlobalTranslationProvider'
import { lazyWithRetry } from './utils/lazyImport'

const Navbar = lazyWithRetry(() => import('./components/Navbar'));

const Home = lazyWithRetry(() => import('./pages/Home'));
const ApartmentsListing = lazyWithRetry(() => import('./pages/ApartmentsListing'));
const RentalsListing = lazyWithRetry(() => import('./pages/RentalsListing'));
const SettingsSection = lazyWithRetry(() => import('./pages/SettingsSection'));
const Flights = lazyWithRetry(() => import('./pages/Flights'));
const Attractions = lazyWithRetry(() => import('./pages/Attractions'));
const AttractionDetail = lazyWithRetry(() => import('./pages/AttractionDetail'));
const AirportTaxis = lazyWithRetry(() => import('./pages/AirportTaxis'));
const ApartmentDetails = lazyWithRetry(() => import('./pages/ApartmentDetails'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const OwnerRegister = lazyWithRetry(() => import('./pages/OwnerRegister'));
const ChooseListingType = lazyWithRetry(() => import('./pages/ChooseListingType'));
const BecomeHost = lazyWithRetry(() => import('./pages/BecomeHost'));
const OwnerLogin = lazyWithRetry(() => import('./pages/OwnerLogin'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const UploadProperty = lazyWithRetry(() => import('./pages/UploadProperty'));
const EnhancedUploadProperty = lazyWithRetry(() => import('./pages/EnhancedUploadProperty'));
const ListProperty = lazyWithRetry(() => import('./pages/ListProperty'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const AdminLanding = lazyWithRetry(() => import('./pages/AdminLanding'));
const AdminAttractions = lazyWithRetry(() => import('./pages/AdminAttractions'));
const AdminAmenities = lazyWithRetry(() => import('./pages/AdminAmenities'));
const AdminAddOns = lazyWithRetry(() => import('./pages/AdminAddOns'));
const CarsList = lazyWithRetry(() => import('./pages/CarsList'));
const CarDetail = lazyWithRetry(() => import('./pages/CarDetail'));
const CarOwnerDashboard = lazyWithRetry(() => import('./pages/CarOwnerDashboard'));
const OwnerAttractionsDashboard = lazyWithRetry(() => import('./pages/OwnerAttractionsDashboard'));
const AdminProfile = lazyWithRetry(() => import('./pages/AdminProfile'));
const UserProfile = lazyWithRetry(() => import('./pages/UserProfile'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const MTNMobileMoneyPayment = lazyWithRetry(() => import('./pages/MTNMobileMoneyPayment'));
const PayCommission = lazyWithRetry(() => import('./pages/PayCommission'));
const RRAEBMIntegration = lazyWithRetry(() => import('./pages/RRAEBMIntegration'));
const BookingProcess = lazyWithRetry(() => import('./pages/BookingProcess'));
const BookingConfirmation = lazyWithRetry(() => import('./pages/BookingConfirmation'));
const CustomerSupport = lazyWithRetry(() => import('./pages/CustomerSupport'));
const PropertyOwnerBookings = lazyWithRetry(() => import('./pages/PropertyOwnerBookings'));
const Messages = lazyWithRetry(() => import('./pages/Messages'));
const OwnerPromotions = lazyWithRetry(() => import('./pages/OwnerPromotions'));
const WorkersManagement = lazyWithRetry(() => import('./pages/WorkersManagement'));
const OwnerReviews = lazyWithRetry(() => import('./pages/OwnerReviews'));
const RatesAvailability = lazyWithRetry(() => import('./pages/RatesAvailability'));
const PropertyManagement = lazyWithRetry(() => import('./pages/PropertyManagement'));
const FinanceDashboard = lazyWithRetry(() => import('./pages/FinanceDashboard'));
const AnalyticsDashboard = lazyWithRetry(() => import('./pages/AnalyticsDashboard'));
const BoostPerformance = lazyWithRetry(() => import('./pages/BoostPerformance'));
const Homes = lazyWithRetry(() => import('./pages/Homes'));
const Experiences = lazyWithRetry(() => import('./pages/Experiences'));
const Deals = lazyWithRetry(() => import('./pages/Deals'));
const DealsPage = lazyWithRetry(() => import('./pages/DealsPage'));
const TestDeals = lazyWithRetry(() => import('./pages/TestDeals'));
const DirectBooking = lazyWithRetry(() => import('./pages/DirectBooking'));
const Invoice = lazyWithRetry(() => import('./pages/Invoice'));
const Receipt = lazyWithRetry(() => import('./pages/Receipt'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const TestUpload = lazyWithRetry(() => import('./pages/TestUpload'));
const QuickLogin = lazyWithRetry(() => import('./pages/QuickLogin'));
const AdminUserManagement = lazyWithRetry(() => import('./pages/AdminUserManagement'));
const AdminReports = lazyWithRetry(() => import('./pages/AdminReports'));
const EditProperty = lazyWithRetry(() => import('./pages/EditProperty'));
const Favorites = lazyWithRetry(() => import('./pages/Favorites'));
const GlobalSearch = lazyWithRetry(() => import('./pages/GlobalSearch'));
const LogoutSuccess = lazyWithRetry(() => import('./pages/LogoutSuccess'));
const BookingSuccess = lazyWithRetry(() => import('./pages/BookingSuccess'));
const PaymentSuccess = lazyWithRetry(() => import('./pages/PaymentSuccess'));
const Transactions = lazyWithRetry(() => import('./pages/Transactions'));

function App() {
  console.debug('[AK] App render start')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Remove artificial delay so the app becomes interactive as soon as possible
    setIsLoading(false)
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
            <GlobalTranslationProvider>
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
            <Route path="/rentals" element={<RentalsListing />} />
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
            <Route path="/search" element={<GlobalSearch />} />
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
            <Route path="/choose-listing-type" element={<ProtectedRoute><ChooseListingType /></ProtectedRoute>} />
            <Route path="/become-host" element={<ProtectedRoute><BecomeHost /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><div className="dashboard"><PropertyOwnerBookings /></div></ProtectedRoute>} />
            <Route path="/user-dashboard" element={<ProtectedRoute><div className="dashboard"><PropertyOwnerBookings /></div></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/account/:section" element={<ProtectedRoute><SettingsSection /></ProtectedRoute>} />
            <Route path="/list-property" element={<ProtectedRoute><ListProperty /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><ListProperty /></ProtectedRoute>} />
            <Route path="/upload-property" element={<ProtectedRoute><ListProperty /></ProtectedRoute>} />
            <Route path="/upload-legacy" element={<ProtectedRoute><UploadProperty /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><div className="dashboard"><AdminDashboard /></div></AdminRoute>} />
            <Route path="/admin/profile" element={<AdminRoute><div className="dashboard"><AdminProfile /></div></AdminRoute>} />
            <Route path="/admin/landing" element={<AdminRoute><div className="dashboard"><AdminLanding /></div></AdminRoute>} />
            <Route path="/admin/attractions" element={<AdminRoute><div className="dashboard"><AdminAttractions /></div></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><div className="dashboard"><AdminUserManagement /></div></AdminRoute>} />
            <Route path="/admin/amenities" element={<AdminRoute><div className="dashboard"><AdminAmenities /></div></AdminRoute>} />
            <Route path="/admin/add-ons" element={<AdminRoute><div className="dashboard"><AdminAddOns /></div></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><div className="dashboard"><AdminReports /></div></AdminRoute>} />
            <Route path="/mtn-payment" element={<ProtectedRoute><MTNMobileMoneyPayment /></ProtectedRoute>} />
            <Route path="/payment/mtn-mobile-money" element={<MTNMobileMoneyPayment />} />
            <Route path="/billing/rra-ebm" element={<RRAEBMIntegration />} />
            <Route path="/support" element={<CustomerSupport />} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><div className="dashboard"><PropertyOwnerBookings /></div></ProtectedRoute>} />
            {/* All property owner dashboard routes now point to PropertyOwnerBookings */}
            <Route path="/owner/cars" element={<ProtectedRoute><div className="dashboard"><CarOwnerDashboard /></div></ProtectedRoute>} />
            <Route path="/owner/attractions" element={<ProtectedRoute><div className="dashboard"><OwnerAttractionsDashboard /></div></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/owner/promotions" element={<ProtectedRoute><div className="dashboard"><OwnerPromotions /></div></ProtectedRoute>} />
            <Route path="/owner/reviews" element={<ProtectedRoute><div className="dashboard"><OwnerReviews /></div></ProtectedRoute>} />
            <Route path="/owner/direct-booking" element={<ProtectedRoute><DirectBooking /></ProtectedRoute>} />
            <Route path="/owner/workers" element={<ProtectedRoute><div className="dashboard"><WorkersManagement /></div></ProtectedRoute>} />
            <Route path="/owner/rates" element={<ProtectedRoute><div className="dashboard"><RatesAvailability /></div></ProtectedRoute>} />
            <Route path="/owner/property" element={<ProtectedRoute><div className="dashboard"><PropertyManagement /></div></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><div className="dashboard"><FinanceDashboard /></div></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><div className="dashboard"><Transactions /></div></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><div className="dashboard"><AnalyticsDashboard /></div></ProtectedRoute>} />
            <Route path="/boost" element={<ProtectedRoute><div className="dashboard"><BoostPerformance /></div></ProtectedRoute>} />
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
            </GlobalTranslationProvider>
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

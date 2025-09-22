# AKWANDA.rw - Apartment Booking Platform

A modern, responsive apartment booking platform built with React and Tailwind CSS, designed specifically for the Rwandan market.

## 🏠 About

AKWANDA.rw is a comprehensive apartment rental platform that connects guests with apartment hosts across Rwanda. The platform offers a seamless experience for finding, booking, and managing apartment rentals, along with supporting services like flights and airport transfers.

## ✨ Features

### 🏠 Core Features
- **Apartment Listings**: Browse and search apartments with advanced filters
- **Detailed Apartment Views**: Comprehensive apartment details with image galleries
- **User Authentication**: Secure login and registration system
- **User Dashboard**: Manage bookings and listings
- **Booking System**: Easy apartment booking with calendar integration
- **Host Management**: Tools for apartment owners to manage their listings

### 🛠️ Supporting Services
- **Flight Booking**: Find flights to reach your apartment destination
- **Local Amenities**: Discover nearby services and attractions
- **Airport Transfers**: Reliable transportation from airport to apartment

### 🎨 Design Features
- **Responsive Design**: Works perfectly on all devices
- **Modern UI/UX**: Clean, professional interface
- **Blue Color Scheme**: Consistent branding throughout
- **Smooth Animations**: Engaging user interactions
- **Accessibility**: Built with accessibility best practices

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/akwanda-frontend.git
   cd akwanda-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to view the application.

## 📁 Project Structure

```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── Hero.jsx              # Landing page hero section
│   │   ├── Navbar.jsx            # Navigation component
│   │   ├── SearchSection.jsx     # Apartment search form
│   │   ├── FeaturedApartments.jsx # Featured apartments grid
│   │   ├── HowItWorks.jsx        # How it works section
│   │   ├── Testimonials.jsx      # Customer testimonials
│   │   └── Footer.jsx            # Footer component
│   ├── pages/
│   │   ├── Home.jsx              # Landing page
│   │   ├── ApartmentsListing.jsx # Apartment listings page
│   │   ├── ApartmentDetails.jsx  # Detailed apartment view
│   │   ├── Flights.jsx           # Flight booking page
│   │   ├── Attractions.jsx       # Local amenities page
│   │   ├── AirportTaxis.jsx      # Airport transfer page
│   │   ├── Login.jsx             # User login page
│   │   ├── Register.jsx          # User registration page
│   │   └── Dashboard.jsx         # User dashboard
│   ├── contexts/
│   │   └── AuthContext.jsx       # Authentication context
│   ├── App.jsx                   # Main app component
│   ├── main.jsx                  # App entry point
│   ├── index.css                 # Global styles
│   └── App.css                   # App-specific styles
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🛠️ Technologies Used

- **React 19.1.1** - Frontend framework
- **React Router DOM 7.9.1** - Client-side routing
- **Tailwind CSS 4.1.13** - Utility-first CSS framework
- **React Icons 5.5.0** - Icon library
- **Vite 7.1.7** - Build tool and development server

## 🎨 Design System

### Color Palette
- **Primary Blue**: `#2563eb` (blue-600)
- **Dark Blue**: `#1d4ed8` (blue-700)
- **Light Blue**: `#dbeafe` (blue-100)
- **Accent Colors**: Various blue shades for gradients and highlights

### Typography
- **Headers**: Bold, modern sans-serif fonts
- **Body**: Clean, readable text with proper line heights
- **Interactive Elements**: Clear, actionable button text

### Components
- **Cards**: Rounded corners with subtle shadows
- **Buttons**: Blue primary buttons with hover effects
- **Forms**: Clean inputs with blue focus states
- **Navigation**: Professional navbar with user authentication

## 📱 Pages Overview

### 🏠 Home Page (`/`)
- Hero section with platform introduction
- Featured apartments showcase
- How it works section
- Customer testimonials

### 🏢 Apartments Listing (`/apartments`)
- Advanced search and filtering
- Grid view of available apartments
- Sorting options (price, rating, newest)
- Responsive card layout

### 🏠 Apartment Details (`/apartment/:id`)
- Image gallery with thumbnails
- Comprehensive apartment information
- Amenities and nearby locations
- Host information and contact
- Booking form with date selection

### ✈️ Flights (`/flights`)
- Flight search form
- Popular destinations from Rwanda
- Flight deals and pricing

### 🎯 Attractions (`/attractions`)
- Local amenities and services
- Category-based filtering
- Distance and pricing information

### 🚗 Airport Taxis (`/taxis`)
- Transfer booking form
- Vehicle type selection
- Popular apartment areas
- Professional driver profiles

### 🔐 Authentication
- **Login** (`/login`): User authentication with social login options
- **Register** (`/register`): Account creation with user type selection

### 👤 Dashboard (`/dashboard`)
- User statistics and overview
- Booking management
- Listing management (for hosts)
- Profile settings

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Code Style
- ESLint configuration for code quality
- Consistent component structure
- Proper prop types and error handling
- Responsive design patterns

## 🌍 Localization

The platform is designed for the Rwandan market with:
- **Currency**: Rwandan Franc (RWF)
- **Locations**: Major Rwandan cities and districts
- **Language**: English with local context
- **Services**: Rwanda-specific amenities and services

## 🔒 Security Features

- Secure authentication system
- Protected routes and user sessions
- Input validation and sanitization
- Secure form handling

## 📊 Performance

- Optimized images and assets
- Lazy loading for better performance
- Responsive images for different screen sizes
- Efficient state management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Email: support@akwanda.rw
- Phone: +250 788 123 456
- Website: https://akwanda.rw

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Create a `.env` file with:
```
VITE_API_URL=your_api_url_here
VITE_APP_NAME=AKWANDA.rw
```

### Deployment Options
- **Vercel**: Recommended for React applications
- **Netlify**: Great for static site hosting
- **AWS S3**: For scalable hosting
- **Heroku**: For full-stack applications

## 🔮 Future Enhancements

- [ ] Real-time chat between guests and hosts
- [ ] Advanced payment integration
- [ ] Mobile app development
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] AI-powered recommendations
- [ ] Virtual apartment tours
- [ ] Review and rating system enhancements

---

**Built with ❤️ for the Rwandan apartment rental market**
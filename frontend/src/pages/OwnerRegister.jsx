import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaPhone, FaBuilding, FaHome, 
  FaHotel, FaWarehouse, FaTree, FaBed, FaUsers, FaArrowLeft, FaArrowRight, 
  FaCheck, FaMapMarkerAlt, FaGlobe, FaStar, FaShieldAlt
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const OwnerRegister = () => {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Generate random property number with 5 numbers and 5 capital letters
  const generatePropertyNumber = () => {
    const numbers = '0123456789';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    
    // Add 5 random numbers
    for (let i = 0; i < 5; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    // Add 5 random capital letters
    for (let i = 0; i < 5; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // Shuffle the result to mix numbers and letters
    return result.split('').sort(() => Math.random() - 0.5).join('');
  };

  const [formData, setFormData] = useState({
    // Step 1: Property Type
    propertyType: '',
    propertySubtype: '',
    
    // Step 2: Property Details
    propertyName: '',
    propertyNumber: generatePropertyNumber(),
    address: '',
    city: '',
    country: 'Rwanda',
    description: '',
    
    // Step 3: Owner Details
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    securityQuestions: [
      { question: '', answer: '' },
      { question: '', answer: '' },
      { question: '', answer: '' }
    ],
    password: '',
    confirmPassword: '',
    userType: 'host',
    
    // Step 4: Verification
    agreeToTerms: false,
    agreeToMarketing: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const [propertyTypes, setPropertyTypes] = useState([]);

  const totalSteps = 4;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // Clear error when user types
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    setError('');
    
    switch (currentStep) {
      case 1:
        if (!formData.propertyType) {
          setError('Please select a property type');
          return false;
        }
        return true;
      case 2:
        if (!formData.propertyName || !formData.propertyNumber || !formData.address || !formData.city) {
          setError('Please fill in all required property details');
          return false;
        }
        return true;
      case 3:
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
          setError('Please fill in all required fields');
          return false;
        }
				{
					const sq = Array.isArray(formData.securityQuestions) ? formData.securityQuestions : [];
					if (sq.length !== 3 || sq.some(x => !String(x?.question || '').trim() || !String(x?.answer || '').trim())) {
						setError('Please set all 3 security questions and answers');
						return false;
					}
				}
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          return false;
        }
        return true;
      case 4:
        if (!formData.agreeToTerms) {
          setError('Please agree to the terms and conditions');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }
    
    const result = await register(formData);

    if (result.success) {
      toast.success('Property Owner account created successfully!');
      navigate('/upload');
    } else {
      const message = result.error || 'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    }
  };
  useEffect(() => {
    const loadPropertyTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/property-types`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Failed to load property types');
        const items = Array.isArray(data.propertyTypes) ? data.propertyTypes : [];
        if (!items.length) return;

        const withUiMeta = items.map((t) => {
          const key = t.key || t.id || t._id;
          let icon = FaBuilding;
          let subtypes = [];
          switch (key) {
            case 'hotel':
              icon = FaHotel;
              subtypes = ['Boutique Hotel', 'Business Hotel', 'Resort Hotel', 'Budget Hotel'];
              break;
            case 'villa':
              icon = FaHome;
              subtypes = ['Luxury Villa', 'Family Villa', 'Beach Villa', 'Mountain Villa'];
              break;
            case 'hostel':
              icon = FaBed;
              subtypes = ['Mixed Dormitory', 'Female Only', 'Private Room', 'Capsule Hostel'];
              break;
            case 'resort':
              icon = FaTree;
              subtypes = ['Beach Resort', 'Mountain Resort', 'Spa Resort', 'Family Resort'];
              break;
            case 'guesthouse':
              icon = FaUsers;
              subtypes = ['Bed & Breakfast', 'Farm Stay', 'City Guesthouse', 'Rural Guesthouse'];
              break;
            case 'apartment':
            default:
              icon = FaBuilding;
              subtypes = ['Studio', '1 Bedroom', '2 Bedroom', '3+ Bedroom', 'Penthouse'];
              break;
          }
          return {
            id: key,
            name: t.name || key,
            description: t.description || '',
            icon,
            subtypes,
          };
        });

        setPropertyTypes(withUiMeta);
      } catch (e) {
        // Fallback to no types if API fails; owner can still retry later
        console.warn('Failed to load property types', e);
      }
    };

    loadPropertyTypes();
  }, []);

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'What type of property do you want to list?';
      case 2: return 'Tell us about your property';
      case 3: return 'Create your account';
      case 4: return 'Almost done!';
      default: return 'Become a Property Owner';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Choose the type that best describes your property';
      case 2: return 'Help guests find and understand your property';
      case 3: return 'We\'ll use this to create your property owner account';
      case 4: return 'Review and complete your registration';
      default: return 'List your property on AKWANDA.rw and start earning';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <FaBuilding className="text-white text-2xl" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {getStepTitle()}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getStepDescription()}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                step < currentStep 
                  ? 'bg-green-500 text-white' 
                  : step === currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? <FaCheck /> : step}
              </div>
              {step < 4 && (
                <div className={`w-12 h-1 mx-2 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Property Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {propertyTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <div
                      key={type.id}
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                        formData.propertyType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => handleInputChange('propertyType', type.id)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${
                          formData.propertyType === type.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <IconComponent className="text-xl" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{type.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {type.subtypes.slice(0, 3).map((subtype, index) => (
                              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {subtype}
                              </span>
                            ))}
                            {type.subtypes.length > 3 && (
                              <span className="text-xs text-gray-500">+{type.subtypes.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Subtype Selection */}
              {formData.propertyType && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    What specific type of {propertyTypes.find(t => t.id === formData.propertyType)?.name.toLowerCase()} is it?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {propertyTypes.find(t => t.id === formData.propertyType)?.subtypes.map((subtype) => (
                      <button
                        key={subtype}
                        type="button"
                        className={`p-3 text-sm rounded-lg border-2 transition-all duration-300 ${
                          formData.propertySubtype === subtype
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-blue-300 text-gray-700'
                        }`}
                        onClick={() => handleInputChange('propertySubtype', subtype)}
                      >
                        {subtype}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Property Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property name *
                </label>
                <div className="relative">
                  <FaHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="e.g., Cozy Downtown Apartment"
                    value={formData.propertyName}
                    onChange={(e) => handleInputChange('propertyName', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property number *
                </label>
                <div className="flex space-x-3">
                  <div className="relative flex-1">
                    <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 font-mono text-lg tracking-wider"
                      value={formData.propertyNumber}
                      readOnly
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('propertyNumber', generatePropertyNumber())}
                    className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-semibold transition-all duration-300 hover:scale-105 whitespace-nowrap"
                  >
                    Generate New
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Auto-generated unique property identifier (10 characters: 5 numbers + 5 letters)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address *
                </label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country
                  </label>
                  <div className="relative">
                    <FaGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                    >
                      <option value="Rwanda">Rwanda</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Burundi">Burundi</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Property description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Describe your property to help guests understand what makes it special..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Owner Account Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First name *
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last name *
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email address *
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">We'll use this to send booking confirmations and important updates</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone number *
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="+250 xxx xxx xxx"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

					<div className="space-y-4">
						<label className="block text-sm font-semibold text-gray-700">
							Security questions (required)
						</label>
						{formData.securityQuestions.map((q, idx) => (
							<div key={idx} className="grid grid-cols-1 gap-3">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Question {idx + 1}</label>
									<input
										type="text"
										className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
										placeholder="Type your question"
										value={q.question}
										onChange={(e) => {
											const next = [...formData.securityQuestions];
											next[idx] = { ...next[idx], question: e.target.value };
											handleInputChange('securityQuestions', next);
										}}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Answer {idx + 1}</label>
									<input
										type="text"
										className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
										placeholder="Type your answer"
										value={q.answer}
										onChange={(e) => {
											const next = [...formData.securityQuestions];
											next[idx] = { ...next[idx], answer: e.target.value };
											handleInputChange('securityQuestions', next);
										}}
									/>
								</div>
							</div>
						))}
					</div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm password *
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Verification and Completion */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <FaShieldAlt className="text-green-600 text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Review your information</h3>
                <p className="text-gray-600">Please review your details before creating your account</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Property Information</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Type:</span> {propertyTypes.find(t => t.id === formData.propertyType)?.name} - {formData.propertySubtype}</p>
                    <p><span className="font-medium">Name:</span> {formData.propertyName}</p>
                    <p><span className="font-medium">Property Number:</span> {formData.propertyNumber}</p>
                    <p><span className="font-medium">Location:</span> {formData.address}, {formData.city}, {formData.country}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Account Information</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Name:</span> {formData.firstName} {formData.lastName}</p>
                    <p><span className="font-medium">Email:</span> {formData.email}</p>
                    <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    checked={formData.agreeToTerms}
                    onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors">
                      Property Owner Terms & Conditions
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors">
                      Privacy Policy
                    </a>
                  </label>
                </div>
                
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    checked={formData.agreeToMarketing}
                    onChange={(e) => handleInputChange('agreeToMarketing', e.target.checked)}
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    I'd like to receive marketing emails about new features, tips for hosts, and special offers (optional)
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start">
                  <FaStar className="text-blue-500 mt-1 mr-3" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">What happens next?</p>
                    <ul className="text-blue-800 space-y-1">
                      <li>• We'll create your property owner account</li>
                      <li>• You'll be redirected to add property details and photos</li>
                      <li>• Our team will review your listing within 24 hours</li>
                      <li>• Once approved, your property will be live on AKWANDA.rw</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mt-6">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              disabled={currentStep === 1}
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Continue
                <FaArrowRight className="ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <FaCheck className="mr-2" />
                Create Account
              </button>
            )}
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have a property owner account?{' '}
            <Link to="/owner-login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Sign in here
            </Link>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Looking for accommodation?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Create guest account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegister;

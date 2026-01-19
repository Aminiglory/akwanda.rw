import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useLocale } from '../contexts/LocaleContext';

const SECURITY_QUESTION_BANK = [
	{ key: 'first_school_name', label: 'First school name' },
	{ key: 'favorite_childhood_food', label: 'Favorite childhood food' },
	{ key: 'birth_city', label: 'City you were born in' },
	{ key: 'first_pet_name', label: 'Name of your first pet' },
	{ key: 'mothers_maiden_name', label: "Mother’s maiden name" },
	{ key: 'best_friend_childhood', label: 'Name of your best childhood friend' },
	{ key: 'first_job_company', label: 'Name of your first job company' },
	{ key: 'favorite_teacher', label: 'Name of your favorite teacher' },
	{ key: 'favorite_sport', label: 'Favorite sport' },
	{ key: 'favorite_movie_childhood', label: 'Favorite childhood movie' }
];

const Register = () => {
  const { t } = useLocale() || {};
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'guest',
    securityQuestions: [
      { questionKey: '', answer: '' },
      { questionKey: '', answer: '' },
      { questionKey: '', answer: '' }
    ]
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

		const sq = Array.isArray(formData.securityQuestions) ? formData.securityQuestions : [];
		if (sq.length !== 3 || sq.some(x => !String(x?.questionKey || '').trim() || !String(x?.answer || '').trim())) {
			setError('Please select 3 security questions and provide answers');
			return;
		}
		const keys = sq.map(x => String(x.questionKey));
		const uniq = new Set(keys);
		if (uniq.size !== 3) {
			setError('Security questions must be different');
			return;
		}
    
    const result = await register(formData);

    if (result.success) {
      toast.success('Account created');
      navigate('/choose-listing-type');
    } else {
      const message = result.error || 'Registration failed. Please try again.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {t ? t('auth.registerTitle') : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t ? t('auth.registerSubtitle') : 'Join AkwandaTravels and start your apartment journey'}
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* User Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {t ? t('auth.iWantTo') : 'I want to'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('userType', 'guest')}
                  className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                    formData.userType === 'guest'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🏠</div>
                    <div className="font-medium">{t ? t('auth.findProperties') : 'Find Properties'}</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('userType', 'host')}
                  className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                    formData.userType === 'host'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🏨</div>
                    <div className="font-medium">{t ? t('auth.becomeHost') : 'Become a Host'}</div>
                  </div>
                </button>
              </div>
              {formData.userType === 'host' && (
                <p className="mt-2 text-xs text-gray-500">
                  Hosts pay a commission per booking based on their commission level. Premium properties receive a visible badge and higher visibility for guests.
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                  First name
                </label>
                <div className="field">
                  <FaUser className="icon-left" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Last name
                </label>
                <div className="field">
                  <FaUser className="icon-left" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />
                </div>
              </div>
            </div>

				{/* Security Questions */}
				<div className="space-y-4">
					<label className="block text-sm font-semibold text-gray-700">
						Security questions (required)
					</label>
					{formData.securityQuestions.map((q, idx) => (
						<div key={idx} className="grid grid-cols-1 gap-3">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Question {idx + 1}</label>
								<select
									className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
									value={q.questionKey}
									onChange={(e) => {
										const next = [...formData.securityQuestions];
										next[idx] = { ...next[idx], questionKey: e.target.value };
										handleInputChange('securityQuestions', next);
									}}
									required
								>
									<option value="">Select a question</option>
									{SECURITY_QUESTION_BANK.map((opt) => (
										<option
											key={opt.key}
											value={opt.key}
											disabled={formData.securityQuestions.some((x, j) => j !== idx && x.questionKey === opt.key)}
										>
											{opt.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">Answer {idx + 1}</label>
								<input
									type="text"
									className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
									placeholder="Type your answer"
									value={q.answer}
									onChange={(e) => {
										const next = [...formData.securityQuestions];
										next[idx] = { ...next[idx], answer: e.target.value };
										handleInputChange('securityQuestions', next);
									}}
									required
								/>
							</div>
						</div>
					))}
				</div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="field">
                <FaEnvelope className="icon-left" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone number
              </label>
              <div className="field">
                <FaPhone className="icon-left" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="+250 xxx xxx xxx"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="field has-right">
                <FaLock className="icon-left" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
                <button
                  type="button"
                  className="action-right text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm password
              </label>
              <div className="field has-right">
                <FaLock className="icon-left" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                />
                <button
                  type="button"
                  className="action-right text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500 transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Create account
            </button>
          </form>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

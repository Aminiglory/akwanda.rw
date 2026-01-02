import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ResetPassword = () => {
  const { t } = useLocale() || {};
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', newPassword: '', confirmPassword: '' });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(['', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (step === 1) {
        if (!form.email) {
          toast.error(t ? t('auth.allFieldsRequired') : 'Please fill in all fields');
          return;
        }
        const res = await fetch(`${API_URL}/api/auth/security-questions?email=${encodeURIComponent(form.email)}`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Could not load security questions');
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setAnswers(['', '', '']);
        setStep(2);
        return;
      }

      if (step === 2) {
        if (!form.email || answers.some(a => !String(a || '').trim())) {
          toast.error(t ? t('auth.allFieldsRequired') : 'Please fill in all fields');
          return;
        }
        const res = await fetch(`${API_URL}/api/auth/verify-security-answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: form.email, answers })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Security answers are incorrect');
        setResetToken(String(data.resetToken || ''));
        setStep(3);
        return;
      }

      if (step === 3) {
        if (!form.email || !resetToken || !form.newPassword || !form.confirmPassword) {
          toast.error(t ? t('auth.allFieldsRequired') : 'Please fill in all fields');
          return;
        }
        if (form.newPassword !== form.confirmPassword) {
          toast.error(t ? t('auth.passwordsMustMatch') : 'Passwords must match');
          return;
        }
        const res = await fetch(`${API_URL}/api/auth/reset-with-security-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: form.email, resetToken, newPassword: form.newPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || (t ? t('auth.resetFailed') : 'Could not reset password'));
        toast.success(data.message || (t ? t('auth.resetSuccess') : 'Password reset successfully'));
        navigate('/login');
        return;
      }
    } catch (err) {
      toast.error(err.message || (t ? t('auth.resetFailed') : 'Could not reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {t ? t('auth.resetPasswordTitle') : 'Change your account password'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t
              ? t('auth.resetPasswordSubtitle')
              : 'Enter your email, answer your security questions, then choose a new password.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t ? t('auth.email') : 'Email address'}</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
				{step === 2 && (
					<div className="space-y-4">
						{questions.map((q, idx) => (
							<div key={q.index ?? idx}>
								<label className="block text-sm font-medium text-gray-700 mb-1">{q.question}</label>
								<input
									type="text"
									className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									value={answers[idx] || ''}
									onChange={(e) => {
										const next = [...answers];
										next[idx] = e.target.value;
										setAnswers(next);
									}}
									required
								/>
							</div>
						))}
					</div>
				)}

				{step === 3 && (
					<>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">{t ? t('auth.newPassword') : 'New password'}</label>
							<input
								type="password"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								value={form.newPassword}
								onChange={(e) => update('newPassword', e.target.value)}
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">{t ? t('auth.confirmPassword') : 'Confirm password'}</label>
							<input
								type="password"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								value={form.confirmPassword}
								onChange={(e) => update('confirmPassword', e.target.value)}
								required
							/>
						</div>
					</>
				)}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? (t ? t('auth.resetting') : 'Resetting...')
					: step === 1
					? 'Continue'
					: step === 2
					? 'Verify answers'
					: (t ? t('auth.resetPassword') : 'Reset password')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

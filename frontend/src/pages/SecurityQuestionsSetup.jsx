import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

const SecurityQuestionsSetup = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const initial = useMemo(
    () => [
      { questionKey: '', answer: '' },
      { questionKey: '', answer: '' },
      { questionKey: '', answer: '' }
    ],
    []
  );

  const [securityQuestions, setSecurityQuestions] = useState(initial);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

		if (securityQuestions.length !== 3 || securityQuestions.some(x => !String(x?.questionKey || '').trim() || !String(x?.answer || '').trim())) {
			toast.error('Please select 3 security questions and provide answers');
			return;
		}
		const keys = securityQuestions.map(x => String(x.questionKey));
		const uniq = new Set(keys);
		if (uniq.size !== 3) {
			toast.error('Security questions must be different');
			return;
		}

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/security-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ securityQuestions })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to save security questions');

      toast.success(data.message || 'Security questions saved');
      await refreshUser();

      navigate('/apartments');
    } catch (e2) {
      toast.error(e2.message || 'Failed to save security questions');
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
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Security questions required</h2>
          <p className="mt-2 text-sm text-gray-600">
            You must set 3 security questions to continue.
          </p>
          {user?.email ? (
            <p className="mt-1 text-xs text-gray-500">Signed in as {user.email}</p>
          ) : null}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-5" onSubmit={submit}>
            {securityQuestions.map((q, idx) => (
              <div key={idx} className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question {idx + 1}</label>
							<select
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								value={q.questionKey}
								onChange={(e) => {
									const next = [...securityQuestions];
									next[idx] = { ...next[idx], questionKey: e.target.value };
									setSecurityQuestions(next);
								}}
								required
							>
								<option value="">Select a question</option>
								{SECURITY_QUESTION_BANK.map((opt) => (
									<option
										key={opt.key}
										value={opt.key}
										disabled={securityQuestions.some((x, j) => j !== idx && x.questionKey === opt.key)}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={q.answer}
                    onChange={(e) => {
                      const next = [...securityQuestions];
                      next[idx] = { ...next[idx], answer: e.target.value };
                      setSecurityQuestions(next);
                    }}
                    required
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save security questions'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SecurityQuestionsSetup;

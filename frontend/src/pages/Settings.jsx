import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaBell, FaLock, FaEye, FaEyeSlash, FaCamera, FaTrash, FaCheck, FaUserCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useLocale } from '../contexts/LocaleContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Settings = () => {
  const { user, updateProfile: ctxUpdateProfile, updateAvatar: ctxUpdateAvatar, logout } = useAuth();
  const { t } = useLocale() || {};
  const safeT = (key, fallback) => {
    if (!t) return fallback;
    const value = t(key);
    const raw = String(value || '').trim();
    const last = String(key || '').split('.').pop();
    const looksLikeKey = !raw || raw === key || raw === last || raw.includes('.');
    const looksCamel = /[a-z][A-Z]/.test(raw) && !/\s/.test(raw);
    if (looksLikeKey || looksCamel) {
      return fallback;
    }
    return value;
  };
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const userId = user?.id || user?._id;
  const [didHydrateProfile, setDidHydrateProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    avatar: user?.avatar || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingAlerts: true,
    marketingEmails: false,
    reviewNotifications: true,
    paymentAlerts: true
  });

  useEffect(() => {
    setDidHydrateProfile(false);
  }, [userId]);

  useEffect(() => {
    if (!userId || didHydrateProfile) return;
    setProfileData((prev) => ({
      ...prev,
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      avatar: user?.avatar || ''
    }));
    setDidHydrateProfile(true);
  }, [userId, didHydrateProfile, user?.firstName, user?.lastName, user?.email, user?.phone, user?.bio, user?.avatar]);

  // Admin site settings (footer contact + social)
  const [siteSettings, setSiteSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('siteSettings');
      return raw ? JSON.parse(raw) : {
        companyEmail: 'info@akwanda.rw',
        phone: '0781714167',
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: ''
      };
    } catch {
      return {
        companyEmail: 'info@akwanda.rw',
        phone: '0781714167',
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: ''
      };
    }
  });

  const tabs = [
    { id: 'profile', label: safeT('settings.profile', 'Profile'), icon: FaUser },
    { id: 'security', label: safeT('settings.security', 'Security'), icon: FaLock },
    { id: 'notifications', label: safeT('settings.notifications', 'Notifications'), icon: FaBell },
    ...(user?.userType === 'admin' ? [{ id: 'site', label: safeT('settings.site', 'Site'), icon: FaUser }] : [])
  ];

  const saveSiteSettings = () => {
    try {
      localStorage.setItem('siteSettings', JSON.stringify(siteSettings));
      window.dispatchEvent(new CustomEvent('siteSettingsUpdated', { detail: siteSettings }));
      toast.success('Site settings saved');
    } catch {
      toast.error('Failed to save site settings');
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const updated = await ctxUpdateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        bio: profileData.bio,
      });
      if (updated) toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/user/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      if (res.ok) {
        toast.success('Password updated successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to update password');
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file) => {
    try {
      setLoading(true);
      await ctxUpdateAvatar(file, false);
      toast.success('Avatar updated successfully');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    try {
      const typed = String(confirmDeleteText || '').trim();
      const pwd = String(deletePassword || '').trim();
      if (typed !== 'DELETE') {
        toast.error('Type DELETE to confirm');
        return;
      }
      if (!pwd) {
        toast.error('Password is required');
        return;
      }

      setLoading(true);
      const res = await fetch(`${API_URL}/api/user/me`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: pwd })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || 'Failed to delete account');
        return;
      }
      toast.success('Account deleted');
      await logout();
      window.location.href = '/';
    } catch (e) {
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
      setDeletePassword('');
      setConfirmDeleteText('');
    }
  };

  const updateNotificationSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/user/notification-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(notifications)
      });
      
      if (res.ok) {
        toast.success('Notification settings updated');
      } else {
        toast.error('Failed to update notification settings');
      }
    } catch (error) {
      toast.error('Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{safeT('settings.title', 'Settings')}</h1>
          <p className="text-gray-600 mt-2">{safeT('settings.subtitle', 'Manage your account settings and preferences')}</p>
        </div>

        {user?.isBlocked && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="text-yellow-900 text-sm">
              <span className="font-semibold">Account deactivated:</span>
              <span className="ml-1">Your account is currently deactivated due to outstanding dues. You can continue updating your profile and notification preferences, but booking and listing actions are restricted until dues are paid.</span>
            </div>
            <div className="mt-2">
              <a href="/billing/pay-commission" className="inline-block px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Pay dues to reactivate</a>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="text-lg" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {profileData.avatar ? (
                      <img
                        src={profileData.avatar}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                        <FaUserCircle className="text-3xl text-gray-500" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 cursor-pointer">
                      <FaCamera className="text-xs" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files[0] && uploadAvatar(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{safeT('settings.profilePhoto', 'Profile photo')}</h3>
                    <p className="text-sm text-gray-600">{safeT('settings.uploadNewPhoto', 'Upload a new profile photo')}</p>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.firstName', 'First name')}</label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.lastName', 'Last name')}</label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('auth.email', 'Email address')}</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.phone', 'Phone number')}</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.bio', 'Bio')}</label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={safeT('settings.tellUsAboutYourself', 'Tell us about yourself...')}
                  />
                </div>
                <button
                  onClick={updateProfile}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <FaCheck className="text-sm" />
                  <span>{loading ? safeT('settings.updating', 'Updating...') : safeT('settings.updateProfile', 'Update Profile')}</span>
                </button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{safeT('settings.changePassword', 'Change Password')}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.currentPassword', 'Current Password')}</label>
                      <div className="field has-right">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="action-right text-gray-500"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.newPassword', 'New Password')}</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.confirmPassword', 'Confirm Password')}</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={updatePassword}
                      disabled={loading}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <span>{loading ? safeT('settings.updating', 'Updating...') : safeT('settings.updatePassword', 'Update Password')}</span>
                    </button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{safeT('settings.deleteAccount', 'Delete account')}</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {safeT('settings.deleteAccountWarning', 'This action is permanent. Type DELETE and enter your password to confirm.')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.confirmText', 'Confirmation')}</label>
                      <input
                        type="text"
                        value={confirmDeleteText}
                        onChange={(e) => setConfirmDeleteText(e.target.value)}
                        placeholder="Type DELETE"
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{safeT('settings.password', 'Password')}</label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <button
                    onClick={deleteAccount}
                    disabled={loading}
                    className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <FaTrash className="text-sm" />
                    <span>{loading ? safeT('settings.deleting', 'Deleting...') : safeT('settings.deleteAccount', 'Delete account')}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{safeT('settings.notificationPreferences', 'Notification Preferences')}</h3>
                  <div className="space-y-4">
                    {Object.entries(notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {key
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase())
                              .replace(/Notifications\b/g, ' notifications')
                              .replace(/Sms\b/g, 'SMS')
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {key === 'emailNotifications' && 'Receive notifications via email'}
                            {key === 'smsNotifications' && 'Receive notifications via SMS'}
                            {key === 'bookingAlerts' && 'Get notified about new bookings'}
                            {key === 'marketingEmails' && 'Receive promotional emails'}
                            {key === 'reviewNotifications' && 'Get notified about new reviews'}
                            {key === 'paymentAlerts' && 'Receive payment confirmations'}
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                    <button
                      onClick={updateNotificationSettings}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? (t ? t('settings.updating') : 'Updating...') : (t ? t('settings.savePreferences') : 'Save Preferences')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'site' && user?.userType === 'admin' && (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                <h3 className="text-lg font-semibold text-gray-900">{t ? t('settings.publicSiteInfo') : 'Public Site Information'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('settings.companyEmail') : 'Company Email'}</label>
                    <input
                      type="email"
                      value={siteSettings.companyEmail}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, companyEmail: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={siteSettings.phone}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('settings.facebookUrl') : 'Facebook URL'}</label>
                    <input
                      type="url"
                      value={siteSettings.facebook}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, facebook: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('settings.instagramUrl') : 'Instagram URL'}</label>
                    <input
                      type="url"
                      value={siteSettings.instagram}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, instagram: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('settings.twitterUrl') : 'Twitter URL'}</label>
                    <input
                      type="url"
                      value={siteSettings.twitter}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, twitter: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t ? t('settings.linkedinUrl') : 'LinkedIn URL'}</label>
                    <input
                      type="url"
                      value={siteSettings.linkedin}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, linkedin: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <button
                  onClick={saveSiteSettings}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t ? t('settings.saveSiteSettings') : 'Save Site Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

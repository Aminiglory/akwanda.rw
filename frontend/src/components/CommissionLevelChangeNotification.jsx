import React, { useState } from 'react';
import { FaCrown, FaExclamationTriangle, FaCheckCircle, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import CommissionUpgradeModal from './CommissionUpgradeModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CommissionLevelChangeNotification = ({ notification, onDismiss, itemType = 'property' }) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!notification || notification.type !== 'commission_level_changed') {
    return null;
  }

  const metadata = notification.metadata || {};
  const commissionLevelId = metadata.commissionLevelId;

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      // Mark notification as read
      await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      toast.success('You have confirmed to keep the updated commission level.');
      if (onDismiss) onDismiss();
    } catch (e) {
      toast.error('Failed to confirm');
    } finally {
      setConfirming(false);
    }
  };

  const handleChangeLevel = () => {
    setShowUpgradeModal(true);
  };

  return (
    <>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-yellow-600 text-xl mr-3 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-1">{notification.title}</h4>
            <p className="text-sm text-yellow-800 mb-3">{notification.message}</p>
            
            {metadata.oldOnlineRate !== undefined && metadata.newOnlineRate !== undefined && (
              <div className="bg-white rounded-lg p-3 mb-3 text-sm">
                <div className="font-medium text-gray-900 mb-2">Rate Changes:</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Online Rate:</span>
                    <span className="font-medium">
                      <span className="text-red-600 line-through mr-2">{metadata.oldOnlineRate}%</span>
                      <span className="text-green-600">{metadata.newOnlineRate}%</span>
                    </span>
                  </div>
                  {metadata.oldDirectRate !== undefined && metadata.newDirectRate !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Direct Rate:</span>
                      <span className="font-medium">
                        <span className="text-red-600 line-through mr-2">{metadata.oldDirectRate}%</span>
                        <span className="text-green-600">{metadata.newDirectRate}%</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="inline-flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                <FaCheckCircle />
                Confirm & Keep Level
              </button>
              <button
                onClick={handleChangeLevel}
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FaCrown />
                Change to Another Level
              </button>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showUpgradeModal && commissionLevelId && (
        <CommissionUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            if (onDismiss) onDismiss();
          }}
          itemId={metadata.itemId || ''}
          itemType={itemType}
          currentLevel={{ _id: commissionLevelId }}
          onUpgradeSuccess={() => {
            toast.success('Commission level changed successfully!');
            if (onDismiss) onDismiss();
          }}
        />
      )}
    </>
  );
};

export default CommissionLevelChangeNotification;


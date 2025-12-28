import React, { useState, useEffect } from 'react';
import { FaTimes, FaCrown, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CommissionUpgradeModal = ({ isOpen, onClose, itemId, itemType, currentLevel, onUpgradeSuccess }) => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState(null);

  useEffect(() => {
    if (isOpen && itemId) {
      fetchCommissionLevels();
      if (currentLevel?._id) {
        setSelectedLevelId(String(currentLevel._id));
      }
    }
  }, [isOpen, itemId, itemType, currentLevel]);

  const fetchCommissionLevels = async () => {
    try {
      setLoading(true);
      const scope = itemType === 'vehicle' ? 'vehicle' : 'property';
      const endpoint = itemType === 'vehicle' 
        ? `${API_URL}/api/cars/commission-levels`
        : `${API_URL}/api/properties/commission-levels`;
      
      const res = await fetch(endpoint, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load commission levels');
      
      setLevels(Array.isArray(data.levels) ? data.levels : []);
    } catch (e) {
      console.error('Failed to fetch commission levels:', e);
      toast.error(e.message || 'Failed to load commission levels');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedLevelId) {
      toast.error('Please select a commission level');
      return;
    }

    try {
      setUpgrading(true);
      const endpoint = itemType === 'vehicle'
        ? `${API_URL}/api/cars/${itemId}/upgrade-commission-level`
        : `${API_URL}/api/properties/${itemId}/commission`;
      
      const method = itemType === 'vehicle' ? 'POST' : 'PUT';
      const body = itemType === 'vehicle'
        ? { commissionLevelId: selectedLevelId }
        : { levelId: selectedLevelId };

      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upgrade commission level');

      toast.success('Commission level upgraded successfully!');
      if (onUpgradeSuccess) {
        onUpgradeSuccess(data[itemType === 'vehicle' ? 'car' : 'property']);
      }
      onClose();
    } catch (e) {
      console.error('Upgrade error:', e);
      toast.error(e.message || 'Failed to upgrade commission level');
    } finally {
      setUpgrading(false);
    }
  };

  if (!isOpen) return null;

  const selectedLevel = levels.find(l => String(l._id) === selectedLevelId);
  const isCurrentLevel = currentLevel && selectedLevelId && String(currentLevel._id) === selectedLevelId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Upgrade Commission Level
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading commission levels...</p>
            </div>
          ) : levels.length === 0 ? (
            <div className="text-center py-8">
              <FaInfoCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No commission levels available</p>
            </div>
          ) : (
            <>
              {/* Current Level Info */}
              {currentLevel && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">Current Level:</span>
                    <span className="text-sm font-semibold text-gray-900">{currentLevel.name || 'Regular'}</span>
                    {currentLevel.isPremium && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        <FaCrown className="w-3 h-3 mr-1" />
                        Premium
                      </span>
                    )}
                  </div>
                  {typeof currentLevel.onlineRate === 'number' && typeof currentLevel.directRate === 'number' && (
                    <p className="text-xs text-gray-600">
                      Online: {currentLevel.onlineRate}% • Direct: {currentLevel.directRate}%
                    </p>
                  )}
                </div>
              )}

              {/* Level Selection */}
              <div className="space-y-3 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Commission Level
                </label>
                {levels.map((level) => {
                  const isSelected = selectedLevelId && String(level._id) === selectedLevelId;
                  return (
                    <div
                      key={level._id}
                      onClick={() => setSelectedLevelId(String(level._id))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => setSelectedLevelId(String(level._id))}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold text-gray-900">{level.name}</span>
                            {level.isPremium && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                <FaCrown className="w-3 h-3 mr-1" />
                                Premium
                              </span>
                            )}
                            {level.isDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                Default
                              </span>
                            )}
                          </div>
                          {level.description && (
                            <p className="text-sm text-gray-600 mt-1">{level.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-gray-700">
                              <span className="font-medium">Online:</span> {level.onlineRate}%
                            </span>
                            <span className="text-gray-700">
                              <span className="font-medium">Direct:</span> {level.directRate}%
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <FaCheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Level Summary */}
              {selectedLevel && !isCurrentLevel && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FaInfoCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Upgrade Summary</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    Your {itemType === 'vehicle' ? 'vehicle' : 'property'} will be upgraded to{' '}
                    <span className="font-semibold">{selectedLevel.name}</span> with commission rates:
                    Online {selectedLevel.onlineRate}% / Direct {selectedLevel.directRate}%
                  </p>
                </div>
              )}

              {isCurrentLevel && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    This is already your current commission level.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={upgrading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={!selectedLevelId || isCurrentLevel || upgrading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {upgrading ? 'Upgrading...' : 'Upgrade Commission Level'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommissionUpgradeModal;


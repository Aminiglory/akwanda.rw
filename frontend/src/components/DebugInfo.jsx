import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DebugInfo = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
      <h3 className="font-bold">Debug Info</h3>
      <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
      <p>User: {user ? JSON.stringify(user, null, 2) : 'None'}</p>
    </div>
  );
};

export default DebugInfo;

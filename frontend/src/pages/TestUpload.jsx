import React from 'react';

const TestUpload = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Test Upload Page
          </h1>
          <p className="text-gray-600">
            This is a test page to verify that the routing and rendering works correctly.
          </p>
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Status Check</h2>
            <ul className="space-y-1 text-blue-800">
              <li>✅ React component is rendering</li>
              <li>✅ CSS styles are loading</li>
              <li>✅ Page layout is working</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestUpload;

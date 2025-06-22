import React from 'react';

export default function WifiCheckModal({ onRetry }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center">
        <h2 className="text-lg font-semibold mb-4">Connect to Café Wi-Fi</h2>
        <p className="mb-6">
          Please connect to the café Wi-Fi to access the menu.
        </p>
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          aria-label="Retry Wi-Fi connection check"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

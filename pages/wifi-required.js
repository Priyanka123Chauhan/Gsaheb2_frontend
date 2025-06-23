// pages/wifi-required.js or pages/table/wifi-required.js

import React from 'react';

export default function WifiRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-700 mt-4">
          You must be connected to the café Wi-Fi to access the menu.
        </p>
    <button
  onClick={() => {
    window.location.href = 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end';
  }}
  className="bg-blue-600 text-white px-4 py-2 rounded"
>
  Open Wi-Fi Settings
</button>

      </div>
    </div>
  );
}

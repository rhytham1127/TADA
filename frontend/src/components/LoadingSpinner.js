import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner({ message = 'Loading...', size = 'medium' }) {
  return (
    <div className={`loading-spinner loading-${size}`}>
      <div className="spinner-animation"></div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
}

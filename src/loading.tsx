import React from 'react';

const NewPageLoading = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'transparent',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Indigo spinner */}
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(99, 102, 241, 0.15)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'ql-spin 0.8s linear infinite',
          }}
        />
        <img
          src="https://qn.whyour.cn/logo.png"
          alt="logo"
          style={{
            width: 32,
            height: 32,
            opacity: 0.6,
            animation: 'ql-pulse 2s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes ql-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ql-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default NewPageLoading;

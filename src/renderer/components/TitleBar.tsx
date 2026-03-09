import React from 'react';

function TitleBar() {

  const handleMinimize = () => {
    window.electron.windowControls.minimize();
  };

  const handleMaximize = () => {
    window.electron.windowControls.maximize();
  };

  const handleClose = () => {
    window.electron.windowControls.close();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-left" />
      <div className="titlebar-center">
        <div className="titlebar-branding">Teachmeit Academy</div>
      </div>
      <div className="titlebar-controls">
        <button
          type="button"
          className="minimize"
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <svg viewBox="0 0 10 1" width="10" height="1">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="maximize"
          onClick={handleMaximize}
          aria-label="Maximize"
        >
          <svg viewBox="0 0 10 10" width="10" height="10">
            <rect
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
        <button
          type="button"
          className="close"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 10 10" width="10" height="10">
            <path
              d="M0,0 L10,10 M10,0 L0,10"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;

import React from 'react';

function TitleBar() {
  const handleOpenDevTools = () => {
    window.electron.windowControls.openDevTools();
  };

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
          className="dev-tools"
          onClick={handleOpenDevTools}
          aria-label="Developer Tools"
          title="Developer Tools"
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z" />
          </svg>
        </button>
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

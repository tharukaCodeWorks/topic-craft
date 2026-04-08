import React, { useState, useEffect } from 'react';
import './SettingsPage.css';

interface CliStatus {
  nodeInstalled: boolean | null;
  installed: boolean | null;
  signedIn: boolean | null;
  loading: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('prerequisites');
  const [generationLanguage, setGenerationLanguage] = useState('English');
  const [cliStatus, setCliStatus] = useState<CliStatus>({
    nodeInstalled: null,
    installed: null,
    signedIn: null,
    loading: true,
  });

  useEffect(() => {
    window.electron.settings.getSettings().then((settings: any) => {
      if (settings?.generationLanguage) {
        setGenerationLanguage(settings.generationLanguage);
      }
    });
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      setCliStatus((prev) => ({ ...prev, loading: true }));
      try {
        const [nodeInstalled, installed, signedIn] = await Promise.all([
          window.electron.cli.checkNode(),
          window.electron.cli.checkInstallation(),
          window.electron.cli.checkAuth(),
        ]);
        setCliStatus({ nodeInstalled, installed, signedIn, loading: false });
      } catch (err) {
        console.error('Failed to check CLI status:', err);
        setCliStatus({
          nodeInstalled: false,
          installed: false,
          signedIn: false,
          loading: false,
        });
      }
    };

    if (activeTab === 'prerequisites') {
      checkStatus();
    }
  }, [activeTab]);

  return (
    <div className="settings-layout">
      <div className="settings-top-panel">
        <div className="settings-top-bar-inner">
          <h1 className="settings-title">Settings</h1>
        </div>
      </div>

      <div className="settings-scroll-content">
        <div className="settings-nav-bar">
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'prerequisites' ? 'active' : ''}`}
            onClick={() => setActiveTab('prerequisites')}
          >
            Prerequisites
          </button>
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>

        {activeTab === 'prerequisites' && (
          <div className="settings-tab-pane">
            <h2>Prerequisites</h2>
            <p className="settings-tab-description">
              To function properly, Topic Craft uses the Gemini CLI under the
              hood. Please ensure you have configured it correctly.
            </p>

            <div className="settings-checklist">
              <div className="settings-checklist-item">
                <div className="settings-status-indicator">
                  {cliStatus.loading && (
                    <span className="icon spinner">⏳</span>
                  )}
                  {!cliStatus.loading && cliStatus.nodeInstalled && (
                    <span className="icon success">✅</span>
                  )}
                  {!cliStatus.loading && !cliStatus.nodeInstalled && (
                    <span className="icon error">❌</span>
                  )}
                </div>
                <div className="settings-item-content">
                  <h3>Step 1: Install Node.js</h3>
                  {cliStatus.loading && <p>Checking Node.js availability...</p>}
                  {!cliStatus.loading && cliStatus.nodeInstalled && (
                    <p>Node.js is installed on this system.</p>
                  )}
                  {!cliStatus.loading && !cliStatus.nodeInstalled && (
                    <div className="settings-error-details">
                      <p>
                        Node.js is not installed or not available in the system
                        PATH.
                      </p>
                      <p>
                        Node.js is required to install and run the Gemini CLI.
                      </p>
                      <p>
                        <strong>To install:</strong> Download it from{' '}
                        <a
                          href="https://nodejs.org/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          nodejs.org
                        </a>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-checklist-item">
                <div className="settings-status-indicator">
                  {cliStatus.loading && (
                    <span className="icon spinner">⏳</span>
                  )}
                  {!cliStatus.loading && cliStatus.installed && (
                    <span className="icon success">✅</span>
                  )}
                  {!cliStatus.loading && !cliStatus.installed && (
                    <span className="icon error">❌</span>
                  )}
                </div>
                <div className="settings-item-content">
                  <h3>Step 2: Install Gemini CLI</h3>
                  {cliStatus.loading && <p>Checking installation status...</p>}
                  {!cliStatus.loading && cliStatus.installed && (
                    <p>Gemini CLI is installed on this system.</p>
                  )}
                  {!cliStatus.loading && !cliStatus.installed && (
                    <div className="settings-error-details">
                      <p>
                        Gemini CLI is not installed or not available in the
                        system PATH.
                      </p>
                      <p>
                        <strong>To install:</strong> Run{' '}
                        <code>npm install -g @google/gemini-cli</code> in your
                        terminal.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-checklist-item">
                <div className="settings-status-indicator">
                  {cliStatus.loading && (
                    <span className="icon spinner">⏳</span>
                  )}
                  {!cliStatus.loading && cliStatus.signedIn && (
                    <span className="icon success">✅</span>
                  )}
                  {!cliStatus.loading && !cliStatus.signedIn && (
                    <span className="icon error">❌</span>
                  )}
                </div>
                <div className="settings-item-content">
                  <h3>Step 3: Sign in to Gemini CLI</h3>
                  {cliStatus.loading && (
                    <p>Checking authentication status...</p>
                  )}
                  {!cliStatus.loading && cliStatus.signedIn && (
                    <p>You are signed in to the Gemini CLI.</p>
                  )}
                  {!cliStatus.loading && !cliStatus.signedIn && (
                    <div className="settings-error-details">
                      <p>
                        You must authenticate the Gemini CLI before using it.
                      </p>
                      <p>
                        <strong>To sign in:</strong> Run{' '}
                        <code>gemini auth</code> (or equivalent command) in your
                        terminal.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!cliStatus.loading && (
              <div className="settings-action-row">
                <button
                  type="button"
                  className="btn-refresh"
                  onClick={() => {
                    setCliStatus({
                      nodeInstalled: null,
                      installed: null,
                      signedIn: null,
                      loading: true,
                    });
                    Promise.all([
                      window.electron.cli.checkNode(),
                      window.electron.cli.checkInstallation(),
                      window.electron.cli.checkAuth(),
                    ])
                      .then(([nodeInstalled, installed, signedIn]) => {
                        setCliStatus({
                          nodeInstalled,
                          installed,
                          signedIn,
                          loading: false,
                        });
                        return null;
                      })
                      .catch((err) => {
                        console.error('Refresh status failed:', err);
                        setCliStatus((prev) => ({ ...prev, loading: false }));
                      });
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh Status
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="settings-tab-pane">
            <h2>Preferences</h2>
            <p className="settings-tab-description">
              Customize how Topic Craft generates your content.
            </p>

            <div className="settings-checklist">
              <div className="settings-checklist-item" style={{ border: 'none', background: 'transparent' }}>
                <div className="settings-item-content" style={{ width: '100%' }}>
                  <h3>Generation Language</h3>
                  <p>Select the language you want to use for generated course content.</p>
                  <select
                    value={generationLanguage}
                    onChange={(e) => {
                      setGenerationLanguage(e.target.value);
                      window.electron.settings.updateSettings({
                        generationLanguage: e.target.value,
                      });
                    }}
                    className="settings-select"
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: '14px',
                      width: '200px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="Italian">Italian</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Russian">Russian</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Sinhala">Sinhala</option>
                    <option value="Tamil">Tamil</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="settings-tab-pane">
            <h2>About Topic Craft</h2>
            <p className="settings-tab-description">Version 1.0.0</p>

            <div className="about-content-card">
              <div className="about-header-brand">
                <div className="about-logo">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    <polyline points="10 2 10 10 13 7 16 10 16 2" />
                  </svg>
                </div>
                <div>
                  <h3>TopicCraft</h3>
                  <p>Craft Knowledge, Instantly</p>
                </div>
              </div>

              <div className="about-details">
                <p>
                  TopicCraft is an AI-powered course creation platform that
                  transforms a simple course title into a fully structured
                  learning experience. From generating organized topics and
                  subtopics to producing detailed, ready-to-use content,
                  TopicCraft helps educators, creators, and teams build complete
                  courses in minutes.
                </p>
                <p>
                  Designed for speed, clarity, and intelligent structuring,
                  TopicCraft removes the manual effort of curriculum planning
                  and lets you focus on refining and delivering impactful
                  knowledge.
                </p>
                <p>
                  Whether you&apos;re building training materials, academic
                  courses, technical documentation, or structured learning
                  paths, TopicCraft turns your ideas into structured,
                  teaching-ready content, instantly.
                </p>
              </div>

              <div className="about-footer-links">
                <a
                  href="https://github.com/tharukaCodeWorks"
                  target="_blank"
                  rel="noreferrer"
                  className="about-link"
                >
                  Crafted with ❤️ by Tharuka Dissanayake
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

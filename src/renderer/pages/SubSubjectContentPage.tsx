import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

interface SubSubject {
  title: string;
  content?: string;
}
interface MainSubject {
  title: string;
  subsubjects: SubSubject[];
}
interface Course {
  id: string;
  coursetitle: string;
  mainsubjects: MainSubject[];
}

function MarkdownRenderer({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hblp])(.+)$/gm, (m) =>
      m.startsWith('<') ? m : `<p>${m}</p>`,
    );

  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function SubSubjectContentPage() {
  const { id, mainIdx, subIdx } = useParams<{
    id: string;
    mainIdx: string;
    subIdx: string;
  }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>(
    {},
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mIdx = parseInt(mainIdx ?? '0', 10);
  const sIdx = parseInt(subIdx ?? '0', 10);

  const mainSubject = course?.mainsubjects?.[mIdx];
  const subSubject = mainSubject?.subsubjects?.[sIdx];

  const fetchCourse = async () => {
    if (!id) return;
    try {
      const data = await window.electron.courses.getCourse(id);
      if (data) setCourse(data);
      else setError('Course not found');
    } catch (_err) {
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    const interval = setInterval(fetchCourse, 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExpandedTopics((prev) => ({ ...prev, [mIdx]: true }));
  }, [mIdx]);

  const handleRegen = async () => {
    if (!id || regenerating || !course) return;
    setRegenerating(true);
    setRegenMsg('Regeneration started — content will appear shortly.');
    try {
      await window.electron.courses.regenerateSubSubjectContent(id, mIdx, sIdx);
      fetchCourse();
    } catch (_err) {
      console.error(_err);
    } finally {
      setRegenerating(false);
      setTimeout(() => setRegenMsg(null), 8000);
    }
  };

  const toggleTopic = (idx: number) => {
    setExpandedTopics((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading && !course)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: 60,
          color: '#6b7280',
          justifyContent: 'center',
        }}
      >
        <div className="ss-spinner" />
        <span>Loading content...</span>
        <style>{`.ss-spinner{width:22px;height:22px;border:2px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (error || !course)
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#dc2626' }}>
        <p>⚠️ {error || 'Course not found'}</p>
        <Link
          to="/courses"
          style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to Courses
        </Link>
      </div>
    );

  if (!mainSubject || !subSubject)
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
        <p>Topic not found.</p>
        <Link
          to={`/courses/${id}`}
          style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to Course
        </Link>
      </div>
    );

  let prev: null | { mIdx: number; sIdx: number; title: string } = null;
  if (sIdx > 0) {
    prev = {
      mIdx,
      sIdx: sIdx - 1,
      title: mainSubject.subsubjects[sIdx - 1].title,
    };
  } else if (mIdx > 0) {
    const pm = course.mainsubjects[mIdx - 1];
    if (pm && pm.subsubjects[pm.subsubjects.length - 1]) {
      prev = {
        mIdx: mIdx - 1,
        sIdx: pm.subsubjects.length - 1,
        title: pm.subsubjects[pm.subsubjects.length - 1].title,
      };
    }
  }

  let next: null | { mIdx: number; sIdx: number; title: string } = null;
  if (sIdx < mainSubject.subsubjects.length - 1) {
    next = {
      mIdx,
      sIdx: sIdx + 1,
      title: mainSubject.subsubjects[sIdx + 1].title,
    };
  } else if (mIdx < course.mainsubjects.length - 1) {
    const nm = course.mainsubjects[mIdx + 1];
    if (nm?.subsubjects?.[0]) {
      next = { mIdx: mIdx + 1, sIdx: 0, title: nm.subsubjects[0].title };
    }
  }

  const totalSubs = (course.mainsubjects ?? []).reduce(
    (a, s) => a + (s.subsubjects?.length ?? 0),
    0,
  );
  const completedSubs = (course.mainsubjects ?? []).reduce(
    (a, s) => a + (s.subsubjects ?? []).filter((ss) => ss.content).length,
    0,
  );

  return (
    <div className="ss-layout">
      {/* Mobile Overlay */}
      <div
        className={`ss-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        onKeyDown={() => {}}
        role="presentation"
      />

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`ss-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="ss-sidebar-header">
          <div className="ss-sidebar-header-top">
            <Link to={`/courses/${id}`} className="ss-course-link">
              <span className="ss-course-icon">
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
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </span>
              <span className="ss-course-title">{course.coursetitle}</span>
            </Link>
            <button
              type="button"
              className="ss-mobile-close"
              onClick={() => setMobileMenuOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="ss-sidebar-progress">
            <div className="ss-sidebar-progress-bar">
              <div
                className="ss-sidebar-progress-fill"
                style={{
                  width: `${totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="ss-sidebar-progress-label">
              {completedSubs}/{totalSubs}
            </span>
          </div>
        </div>

        <nav className="ss-nav-tree">
          {(course.mainsubjects ?? []).map((subject, mI) => {
            const isCurrentTopic = mI === mIdx;
            const isExpanded = expandedTopics[mI] ?? isCurrentTopic;
            const subsDone = subject.subsubjects.filter(
              (s) => s.content,
            ).length;

            return (
              <div
                key={subject.title}
                className={`ss-nav-topic ${isCurrentTopic ? 'ss-nav-topic-active' : ''}`}
              >
                <button
                  type="button"
                  className="ss-nav-topic-btn"
                  onClick={() => toggleTopic(mI)}
                >
                  <span
                    className={`ss-nav-chevron ${isExpanded ? 'expanded' : ''}`}
                  >
                    ›
                  </span>
                  <span className="ss-nav-topic-title">{subject.title}</span>
                  <span className="ss-nav-topic-count">
                    {subsDone}/{subject.subsubjects.length}
                  </span>
                </button>

                {isExpanded && (
                  <ul className="ss-nav-subs">
                    {subject.subsubjects.map((sub, sI) => {
                      const isActive = mI === mIdx && sI === sIdx;
                      const hasContent = !!sub.content;
                      return (
                        <li key={sub.title}>
                          <Link
                            to={`/courses/${id}/content/${mI}/${sI}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`ss-nav-sub-link ${isActive ? 'active' : ''} ${hasContent ? 'done' : 'pending'}`}
                          >
                            <span className="ss-nav-sub-status">
                              {hasContent ? (
                                <span className="ss-check">✓</span>
                              ) : (
                                <span className="ss-dot" />
                              )}
                            </span>
                            <span className="ss-nav-sub-title">
                              {sub.title}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="ss-main">
        <div className="ss-top-panel">
          <div className="ss-top-bar-inner">
            <button
              type="button"
              className="ss-mobile-toggle"
              onClick={() => setMobileMenuOpen(true)}
            >
              ☰ Menu
            </button>

            <Link to="/courses" className="ss-back-btn" title="Back to Courses">
              ←
            </Link>

            <div className="ss-title-container">
              <span className="ss-subject-tag">{mainSubject.title}</span>
              <span className="ss-title-sep">/</span>
              <h1 className="ss-title">{subSubject.title}</h1>
            </div>

            <div className="ss-header-actions">
              <button
                type="button"
                className={`ss-regen-icon-btn ${regenerating ? 'ss-regen-busy' : ''}`}
                onClick={handleRegen}
                disabled={regenerating}
                title="Regenerate content for this topic"
              >
                {regenerating ? <span className="ss-regen-spinner" /> : '↻'}
              </button>
            </div>
          </div>
          {regenMsg && <p className="ss-regen-msg">{regenMsg}</p>}
        </div>

        <div className="ss-scroll-content">
          <div className="ss-content-card">
            {subSubject.content ? (
              <div className="ss-markdown">
                <MarkdownRenderer content={subSubject.content} />
              </div>
            ) : (
              <div className="ss-generating">
                <div className="ss-gen-icon">🤖</div>
                <h3>Content is being generated...</h3>
                <p>
                  The AI is writing the course material for this topic. Check
                  back in a moment or refresh.
                </p>
                <button
                  type="button"
                  className="ss-refresh-btn"
                  onClick={fetchCourse}
                >
                  ↻ Refresh
                </button>
              </div>
            )}
          </div>

          <div className="ss-bottom-nav">
            {prev ? (
              <Link
                to={`/courses/${id}/content/${prev.mIdx}/${prev.sIdx}`}
                className="ss-nav-btn ss-nav-prev"
              >
                <span className="ss-nav-dir">← Previous</span>
                <span className="ss-nav-label">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}

            {next ? (
              <Link
                to={`/courses/${id}/content/${next.mIdx}/${next.sIdx}`}
                className="ss-nav-btn ss-nav-next"
              >
                <span className="ss-nav-dir">Next →</span>
                <span className="ss-nav-label">{next.title}</span>
              </Link>
            ) : (
              <Link to={`/courses/${id}`} className="ss-nav-btn ss-nav-next">
                <span className="ss-nav-dir">Finish →</span>
                <span className="ss-nav-label">Back to Course</span>
              </Link>
            )}
          </div>
        </div>
      </main>

      <style>{`
                /* Layout */
                .ss-layout {
                    display: flex;
                    gap: 0;
                    height: calc(100vh - 86px); /* 38px titlebar + 48px vertical padding (24px top, 24px bottom) */
                    overflow: hidden;
                    border-radius: 16px; /* give the whole frame a nice rounded corner */
                    border: 1px solid var(--border);
                    margin: -8px 0; /* Pulls up slightly to achieve the visual 24px top padding */
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                }

                /* SIDEBAR */
                .ss-sidebar {
                    width: 280px;
                    flex-shrink: 0;
                    background: var(--surface);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                    z-index: 50;
                    transition: transform 0.3s ease;
                }
                .ss-sidebar-header {
                    padding: 0 16px;
                    border-bottom: 1px solid var(--border);
                    height: 84px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .ss-sidebar-header-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
                .ss-mobile-close { display: none; background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; }
                
                .ss-mobile-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.65);
                    z-index: 40;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .ss-mobile-overlay.open { opacity: 1; display: block; }
                .ss-course-link {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-decoration: none;
                    color: var(--text);
                    font-weight: 700;
                    font-size: 0.85rem;
                    margin-bottom: 8px;
                    line-height: 1.3;
                }
                .ss-course-link:hover { color: var(--primary); }
                .ss-course-icon { font-size: 1.1rem; flex-shrink: 0; }
                .ss-course-title { flex: 1; }
                .ss-sidebar-progress {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .ss-sidebar-progress-bar {
                    flex: 1;
                    height: 5px;
                    background: var(--border);
                    border-radius: 999px;
                    overflow: hidden;
                }
                .ss-sidebar-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--secondary), var(--primary));
                    border-radius: 999px;
                    transition: width 0.4s ease;
                }
                .ss-sidebar-progress-label {
                    font-size: 0.7rem;
                    color: #94a3b8;
                    font-weight: 600;
                    white-space: nowrap;
                }

                /* Nav tree */
                .ss-nav-tree {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px 0 24px;
                }
                .ss-nav-tree::-webkit-scrollbar { width: 4px; }
                .ss-nav-tree::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

                .ss-nav-topic { border-bottom: 1px solid var(--border); }
                .ss-nav-topic-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    width: 100%;
                    padding: 10px 16px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    text-align: left;
                    color: var(--text);
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: background 0.12s, color 0.12s;
                }
                .ss-nav-topic-btn:hover { 
                    background: rgba(16, 185, 129, 0.1); 
                    color: var(--primary); 
                }
                .ss-nav-topic-active > .ss-nav-topic-btn { color: var(--primary); }
                .ss-nav-chevron {
                    font-size: 1rem;
                    color: #94a3b8;
                    transition: transform 0.2s;
                    flex-shrink: 0;
                    line-height: 1;
                }
                .ss-nav-chevron.expanded { transform: rotate(90deg); }
                .ss-nav-topic-title { flex: 1; line-height: 1.3; }
                .ss-nav-topic-count {
                    font-size: 0.68rem;
                    color: inherit; /* inherit the normal or hovered text color */
                    font-weight: 500;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 1px 5px;
                    border-radius: 10px;
                    flex-shrink: 0;
                    transition: background 0.12s, border-color 0.12s;
                }
                .ss-nav-topic-btn:hover .ss-nav-topic-count {
                    background: rgba(16, 185, 129, 0.2);
                    border-color: rgba(16, 185, 129, 0.3);
                }

                .ss-nav-subs {
                    list-style: none;
                    padding: 0 0 4px 0;
                    margin: 0;
                }
                .ss-nav-sub-link {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 7px 16px 7px 28px;
                    text-decoration: none;
                    font-size: 0.78rem;
                    color: #94a3b8;
                    transition: background 0.12s, color 0.12s;
                    line-height: 1.4;
                }
                .ss-nav-sub-link:hover { background: var(--hover-bg); color: var(--text); }
                .ss-nav-sub-link.active {
                    background: var(--active-bg);
                    color: var(--accent);
                    font-weight: 600;
                    border-right: 3px solid var(--primary);
                }
                .ss-nav-sub-link.active:hover { background: rgba(5, 150, 105, 0.4); }
                .ss-nav-sub-status { flex-shrink: 0; width: 14px; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
                .ss-check { font-size: 0.7rem; color: var(--primary); font-weight: 700; }
                .ss-dot {
                    display: inline-block;
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #64748b;
                }
                .ss-nav-sub-link.active .ss-dot { background: var(--accent); animation: pulse 1.4s ease-in-out infinite; }
                @keyframes pulse { 0%,100% { opacity:1;transform:scale(1); } 50% { opacity:0.5;transform:scale(0.7); } }
                .ss-nav-sub-title { flex: 1; }

                /* MAIN CONTENT */
                .ss-main {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                }
                
                /* TOP PANEL - SLEEK MODERN REDESIGN */
                .ss-top-panel {
                    padding: 0 32px;
                    background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    flex-shrink: 0;
                    border-bottom: 1px solid var(--border);
                    height: 84px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    z-index: 10;
                    position: relative;
                }
                .ss-top-panel::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; height: 1px;
                    background: linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.2) 30%, rgba(16,185,129,0.2) 70%, rgba(16,185,129,0) 100%);
                }
                
                .ss-scroll-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 32px; /* Equal padding on Top, Right, Bottom, Left */
                    overflow: hidden; /* Hide main scroll, move it to card */
                    gap: 24px;
                }

                .ss-top-bar-inner { 
                    display: flex; align-items: center; gap: 16px; 
                }
                
                .ss-back-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 36px; height: 36px; border-radius: 50%;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(51, 65, 85, 0.4);
                    color: #94a3b8; text-decoration: none; font-size: 1.2rem;
                    transition: all 0.2s ease; flex-shrink: 0;
                }
                .ss-back-btn:hover {
                    background: rgba(16, 185, 129, 0.15); border-color: var(--primary); color: var(--primary);
                }

                .ss-title-container {
                    display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;
                }
                .ss-title-sep { color: #475569; font-weight: 300; font-size: 1.4rem; }

                .ss-mobile-toggle {
                    display: none;
                    align-items: center;
                    gap: 6px;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color: var(--primary);
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .ss-mobile-toggle:hover { background: rgba(16, 185, 129, 0.15); border-color: var(--primary); }
                
                .ss-header-actions { display:flex;align-items:center;gap:12px;flex-shrink:0; }
                
                .ss-subject-tag {
                    display:inline-flex;padding:5px 12px;border-radius:8px;
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    color:var(--primary);font-size:0.75rem;font-weight:700;
                    letter-spacing: 0.5px;text-transform: uppercase;
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.05);
                    white-space: nowrap; flex-shrink: 0;
                }
                
                .ss-regen-icon-btn {
                    display:inline-flex;align-items:center;justify-content:center;
                    width: 36px; height: 36px; border-radius: 50%;
                    border:1px solid rgba(255,255,255,0.1);
                    background: rgba(255, 255, 255, 0.03); color:var(--text);font-size:1.2rem;
                    cursor:pointer;transition:all 0.2s ease;
                    backdrop-filter: blur(4px); flex-shrink: 0;
                    padding: 0;
                }
                .ss-regen-icon-btn:hover:not(:disabled) { background:rgba(255, 255, 255, 0.08);border-color:rgba(255,255,255,0.2); }
                .ss-regen-icon-btn:active:not(:disabled) { transform: scale(0.95); }
                .ss-regen-icon-btn:disabled { opacity:0.5;cursor:not-allowed; }

                .ss-regen-spinner {
                    display:inline-block;width:16px;height:16px;
                    border:2px solid var(--border);border-top-color:var(--primary);
                    border-radius:50%;animation:spin 0.6s linear infinite;
                }
                @keyframes spin{to{transform:rotate(360deg)}}
                .ss-regen-msg { 
                    font-size:0.8rem;
                    color:var(--accent);
                    margin:0;
                    background:rgba(52, 211, 153, 0.15);
                    padding:8px 12px;
                    border-radius:8px;
                    position: absolute;
                    top: 100%;
                    left: 32px;
                    right: 32px;
                    margin-top: 12px;
                }
                .ss-title { font-size:1.3rem;font-weight:700;color:var(--text);margin:0;line-height:1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                .ss-content-card {
                    flex: 1; /* Take up vertical space */
                    display: flex;
                    flex-direction: column;
                    background:var(--surface);
                    border:1px solid var(--border);
                    border-radius:16px;
                    box-shadow:0 4px 12px rgba(0,0,0,0.15);
                    overflow: hidden; /* Keep rounded corners on scroll */
                }

                .ss-generating { 
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align:center;
                    padding:40px 20px;
                    color:#94a3b8; 
                }
                .ss-gen-icon { font-size:3rem;margin-bottom:12px; }
                .ss-generating h3 { font-size:1.1rem;font-weight:600;color:var(--text);margin:0 0 8px; }
                .ss-generating p { font-size:0.875rem;margin:0 0 20px;line-height:1.6; }
                .ss-refresh-btn {
                    padding:9px 20px;border-radius:8px;border:1.5px solid var(--border);
                    background:transparent;color:var(--text);font-weight:600;font-size:0.875rem;
                    cursor:pointer;transition:background 0.15s;
                }
                .ss-refresh-btn:hover { background:var(--hover-bg); }

                .ss-markdown { 
                    flex: 1;
                    overflow-y: auto;
                    padding: 32px 40px;
                    font-size:0.9375rem;
                    line-height:1.75;
                    color:#cbd5e1; 
                }
                .ss-markdown::-webkit-scrollbar { width: 4px; }
                .ss-markdown::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

                .ss-markdown h1,.ss-markdown h2,.ss-markdown h3 { color:var(--text);font-weight:700;margin:1.5em 0 0.5em; }
                .ss-markdown h1 { font-size:1.4rem; }
                .ss-markdown h2 { font-size:1.2rem;padding-bottom:6px;border-bottom:1px solid var(--border); }
                .ss-markdown h3 { font-size:1rem; }
                .ss-markdown p { margin:0.75em 0; }
                .ss-markdown ul,.ss-markdown ol { padding-left:1.5rem;margin:0.75em 0; }
                .ss-markdown li { margin-bottom:4px; }
                .ss-markdown code {
                    background:var(--hover-bg);border-radius:4px;
                    padding:2px 6px;font-size:0.875em;color:var(--accent);font-family:monospace;
                }
                .ss-markdown pre {
                    background:#0f172a;color:#f8fafc;border-radius:10px;
                    padding:20px;overflow-x:auto;margin:1em 0;
                    border: 1px solid var(--border);
                }
                .ss-markdown pre code { background:none;color:inherit;padding:0;font-size:0.875rem; }
                .ss-markdown strong { color:#f8fafc; }
                .ss-markdown blockquote {
                    border-left:4px solid var(--primary);padding:12px 16px;margin:1em 0;
                    background:var(--hover-bg);border-radius:0 8px 8px 0;color:#94a3b8;
                }
                .ss-markdown hr { border:none;border-top:1px solid var(--border);margin:1.5em 0; }

                .ss-bottom-nav { 
                    display:flex;
                    flex-shrink: 0; /* Keep it static at the bottom */
                    justify-content:space-between;
                    gap:12px; 
                }
                .ss-nav-btn {
                    display:flex;flex-direction:column;gap:3px;
                    padding:14px 20px;border-radius:12px;border:1px solid var(--border);
                    background:var(--surface);text-decoration:none;color:var(--text);
                    transition:background 0.2s ease,box-shadow 0.2s ease;min-width:180px;
                    box-shadow:0 4px 12px rgba(0,0,0,0.15);
                }
                .ss-nav-btn:hover { background:var(--hover-bg);box-shadow:0 8px 24px rgba(0,0,0,0.25); }
                .ss-nav-next { align-items:flex-end; }
                .ss-nav-dir { font-size:0.7rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em; }
                .ss-nav-label { font-size:0.8rem;font-weight:600;color:var(--text); }

                @media (max-width: 768px) {
                    .ss-sidebar {
                        position: fixed;
                        top: 64px;
                        left: 0;
                        bottom: 0;
                        transform: translateX(-100%);
                        box-shadow: 4px 0 16px rgba(0,0,0,0.1);
                    }
                    .ss-sidebar.mobile-open { transform: translateX(0); }
                    .ss-mobile-toggle, .ss-mobile-close { display: flex; }
                    .ss-mobile-overlay { display: block; top: 64px; pointer-events: none; }
                    .ss-mobile-overlay.open { pointer-events: auto; }
                    .ss-top-panel { padding: 0 16px; height: 76px; }
                    .ss-scroll-content { padding: 16px 16px 20px; min-width: 100vw; }
                    .ss-bottom-nav { flex-direction: column; }
                }
            `}</style>
    </div>
  );
}

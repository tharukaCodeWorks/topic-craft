import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import CustomModal from '../components/CustomModal';

interface Comment {
  id: string;
  text: string;
  author: 'user' | 'ai';
  timestamp: number;
}
interface SubSubject {
  title: string;
  content?: string;
  comments?: Comment[];
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
  const [Markdown, setMarkdown] = useState<{
    ReactMarkdown: any;
    remarkGfm: any;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([import('react-markdown'), import('remark-gfm')]).then(
      ([md, gfm]) => {
        if (isMounted) {
          setMarkdown({ ReactMarkdown: md.default, remarkGfm: gfm.default });
        }
      },
    );
    return () => {
      isMounted = false;
    };
  }, []);

  if (!Markdown) {
    return (
      <div className="ss-markdown">
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            color: 'inherit',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  const { ReactMarkdown, remarkGfm } = Markdown;

  return (
    <div className="ss-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }: any) => <h1 {...props} />,
          h2: ({ node, ...props }: any) => <h2 {...props} />,
          h3: ({ node, ...props }: any) => <h3 {...props} />,
          ul: ({ node, ...props }: any) => <ul {...props} />,
          ol: ({ node, ...props }: any) => <ol {...props} />,
          li: ({ node, ...props }: any) => <li {...props} />,
          pre: ({ node, ...props }: any) => <pre {...props} />,
          code: ({ node, inline, ...props }: any) =>
            inline ? <code {...props} /> : <code {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CommentSection({
  courseId,
  mainIdx,
  subIdx,
  comments,
  onCommentAdded,
  isOpen,
  onClose,
}: {
  courseId: string;
  mainIdx: number;
  subIdx: number;
  comments: Comment[];
  onCommentAdded: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await window.electron.courses.addComment(
        courseId,
        mainIdx,
        subIdx,
        text.trim(),
      );
      setText('');
      onCommentAdded();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`ss-comment-drawer ${isOpen ? 'open' : ''}`}>
      <div className="ss-comment-drawer-header">
        <h3>Questions & Comments</h3>
        <button type="button" className="ss-drawer-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="ss-comment-list">
        {comments.map((c) => (
          <div key={c.id} className={`ss-comment-item ${c.author}`}>
            <div className="ss-comment-header">
              <span className="ss-comment-author">
                {c.author === 'user' ? 'You' : 'AI Tutor'}
              </span>
              <span className="ss-comment-time">
                {new Date(c.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="ss-comment-body">
              {c.author === 'ai' ? (
                <MarkdownRenderer content={c.text} />
              ) : (
                <p>{c.text}</p>
              )}
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="ss-no-comments">No comments yet. Ask a question!</p>
        )}
      </div>
      <form className="ss-comment-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="Ask a question about this topic..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
        />
        <button type="submit" disabled={submitting || !text.trim()}>
          {submitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [addingMain, setAddingMain] = useState(false);
  const [newMainTitle, setNewMainTitle] = useState('');
  const [addingSubToIdx, setAddingSubToIdx] = useState<number | null>(null);
  const [newSubTitle, setNewSubTitle] = useState('');

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

  const handleRegen = () => {
    if (!id || regenerating || !course) return;
    setRegenModalOpen(true);
  };

  const confirmRegen = async () => {
    if (!id) return;
    setRegenModalOpen(false);

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

  const handleAddMainSubject = async () => {
    if (!id || !newMainTitle.trim()) return;
    try {
      await window.electron.courses.addMainSubject(id, newMainTitle.trim());
      setNewMainTitle('');
      setAddingMain(false);
      fetchCourse();
    } catch (err) {
      console.error('Failed to add main subject:', err);
    }
  };

  const handleAddSubSubject = async (mIdx: number) => {
    if (!id || !newSubTitle.trim()) return;
    try {
      await window.electron.courses.addSubSubject(id, mIdx, newSubTitle.trim());
      setNewSubTitle('');
      setAddingSubToIdx(null);
      fetchCourse();
    } catch (err) {
      console.error('Failed to add sub subject:', err);
    }
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

  if (!mainSubject || !subSubject) {
    if (course.mainsubjects && course.mainsubjects.length > 0) {
      const firstMain = course.mainsubjects[0];
      if (firstMain.subsubjects && firstMain.subsubjects.length > 0) {
        return <Navigate to={`/courses/${id}/content/0/0`} replace />;
      }
    }

    return (
      <div className="ss-layout">
        <aside className="ss-sidebar">
          <div className="ss-sidebar-header">
            <Link to="/courses" className="ss-course-link">
              <span className="ss-course-icon">←</span>
              <span className="ss-course-title">Back to Courses</span>
            </Link>
          </div>
          <div className="ss-nav-tree">
            {addingMain ? (
              <div className="ss-sidebar-add-form">
                <input
                  type="text"
                  className="ss-sidebar-input"
                  placeholder="Subject title..."
                  value={newMainTitle}
                  onChange={(e) => setNewMainTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMainSubject()}
                  autoFocus
                />
                <button onClick={handleAddMainSubject}>Add</button>
                <button onClick={() => setAddingMain(false)}>Cancel</button>
              </div>
            ) : (
              <button
                className="ss-sidebar-add-btn"
                onClick={() => setAddingMain(true)}
              >
                + New Subject
              </button>
            )}
          </div>
        </aside>
        <main className="ss-main">
          <div className="ss-empty-state">
            <div className="ss-empty-icon">📚</div>
            <h2>No subjects yet</h2>
            <p>Start by adding a main subject to your curriculum.</p>
            {!addingMain && (
              <button
                className="ss-empty-add-btn"
                onClick={() => setAddingMain(true)}
              >
                + Add Main Subject
              </button>
            )}
            {addingMain && (
              <div className="ss-empty-form">
                <input
                  type="text"
                  className="ss-empty-input"
                  placeholder="e.g. Introduction to React"
                  value={newMainTitle}
                  onChange={(e) => setNewMainTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMainSubject()}
                  autoFocus
                />
                <div className="ss-empty-actions">
                  <button onClick={handleAddMainSubject}>Create Subject</button>
                  <button onClick={() => setAddingMain(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

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
            <div className="ss-course-link">
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
            </div>
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
                  <>
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
                    {addingSubToIdx === mI ? (
                      <div className="ss-sidebar-add-form mini">
                        <input
                          type="text"
                          className="ss-sidebar-input"
                          placeholder="Sub title..."
                          value={newSubTitle}
                          onChange={(e) => setNewSubTitle(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === 'Enter' && handleAddSubSubject(mI)
                          }
                          autoFocus
                        />
                        <div className="ss-sidebar-add-actions">
                          <button onClick={() => handleAddSubSubject(mI)}>
                            Add
                          </button>
                          <button onClick={() => setAddingSubToIdx(null)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="ss-sidebar-sub-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingSubToIdx(mI);
                        }}
                      >
                        + Add Sub Subject
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {addingMain ? (
            <div className="ss-sidebar-add-form">
              <input
                type="text"
                className="ss-sidebar-input"
                placeholder="Subject title..."
                value={newMainTitle}
                onChange={(e) => setNewMainTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMainSubject()}
                autoFocus
              />
              <div className="ss-sidebar-add-actions">
                <button onClick={handleAddMainSubject}>Add</button>
                <button onClick={() => setAddingMain(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              className="ss-sidebar-add-btn"
              onClick={() => setAddingMain(true)}
            >
              + New Subject
            </button>
          )}
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
              <button
                type="button"
                className={`ss-comments-toggle-btn ${commentsOpen ? 'active' : ''}`}
                onClick={() => setCommentsOpen(!commentsOpen)}
                title="Toggle Comments"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {subSubject.comments && subSubject.comments.length > 0 && (
                  <span className="ss-comment-badge">
                    {subSubject.comments.length}
                  </span>
                )}
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
              <Link to="/courses" className="ss-nav-btn ss-nav-next">
                <span className="ss-nav-dir">Finish →</span>
                <span className="ss-nav-label">Back to Courses</span>
              </Link>
            )}
          </div>
        </div>
      </main>

      <CommentSection
        courseId={id!}
        mainIdx={mIdx}
        subIdx={sIdx}
        comments={subSubject.comments || []}
        onCommentAdded={fetchCourse}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />

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
                    overflow-x: hidden;
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
                .ss-mobile-close { display: none; background: none; border: none !important; font-size: 1.2rem; color: #94a3b8; cursor: pointer; padding: 4px !important; border-radius: 6px; box-shadow: none !important; }
                
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
                .ss-course-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
                    overflow-x: hidden;
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
                    box-sizing: border-box;
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
                .ss-nav-topic-title { flex: 1; min-width: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .ss-nav-topic-count {
                    font-size: 0.68rem;
                    color: inherit;
                    font-weight: 500;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 1px 5px;
                    border-radius: 10px;
                    flex-shrink: 0;
                    transition: background 0.12s, border-color 0.12s;
                    margin-left: 4px;
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
                    width: 100%;
                    padding: 7px 16px 7px 28px;
                    text-decoration: none;
                    font-size: 0.78rem;
                    color: #94a3b8;
                    transition: background 0.12s, color 0.12s;
                    line-height: 1.4;
                    box-sizing: border-box;
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
                .ss-nav-sub-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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

                /* Management Styles */
                .ss-sidebar-add-btn {
                    width: auto; margin: 12px 16px; padding: 10px;
                    border: 1px dashed var(--border); border-radius: 8px;
                    background: none; color: #94a3b8; font-size: 0.75rem;
                    font-weight: 600; cursor: pointer; transition: all 0.2s;
                    box-sizing: border-box;
                }
                .ss-sidebar-add-btn:hover { border-color: var(--primary); color: var(--primary); background: rgba(16, 185, 129, 0.05); }

                .ss-sidebar-sub-add-btn {
                    width: auto; margin: 4px 16px 12px 28px; padding: 6px;
                    border: 1px dashed var(--border); border-radius: 6px;
                    background: none; color: #64748b; font-size: 0.7rem;
                    font-weight: 500; cursor: pointer; transition: all 0.2s;
                    text-align: left; box-sizing: border-box;
                }
                .ss-sidebar-sub-add-btn:hover { border-color: var(--primary); color: var(--primary); }

                .ss-sidebar-add-form { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; }
                .ss-sidebar-add-form.mini { padding: 4px 16px 12px 28px; }
                
                .ss-sidebar-input {
                    width: 100%; padding: 8px 12px; border-radius: 6px;
                    border: 1px solid var(--border); background: var(--bg);
                    color: var(--text); font-size: 0.75rem; outline: none;
                    box-sizing: border-box;
                }
                .ss-sidebar-input:focus { border-color: var(--primary); }

                .ss-sidebar-add-actions { display: flex; gap: 8px; width: 100%; box-sizing: border-box; }
                .ss-sidebar-add-actions button {
                    flex: 1; padding: 6px; border-radius: 4px; border: 1px solid var(--border);
                    background: none; color: #94a3b8; font-size: 0.7rem; font-weight: 600; cursor: pointer;
                    box-sizing: border-box;
                }
                .ss-sidebar-add-actions button:first-child { background: var(--primary); color: white; border: none; }

                /* Empty State */
                .ss-empty-state {
                    flex: 1; display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 40px; text-align: center;
                }
                .ss-empty-icon { font-size: 4rem; margin-bottom: 20px; }
                .ss-empty-state h2 { color: var(--text); margin-bottom: 8px; }
                .ss-empty-state p { color: #64748b; margin-bottom: 32px; }
                
                .ss-empty-add-btn {
                    padding: 12px 24px; border-radius: 12px; background: var(--primary);
                    color: white; border: none; font-weight: 600; cursor: pointer;
                    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
                }
                
                .ss-empty-form { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
                .ss-empty-input {
                    width: 100%; padding: 14px 20px; border-radius: 12px;
                    border: 1px solid var(--border); background: var(--surface);
                    color: var(--text); font-size: 1rem; outline: none;
                }
                .ss-empty-actions { display: flex; gap: 12px; }
                .ss-empty-actions button {
                    flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--border);
                    background: none; color: #94a3b8; font-weight: 600; cursor: pointer;
                }
                .ss-empty-actions button:first-child { background: var(--primary); color: white; border: none; }
                
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
                    width: 36px; height: 36px; border-radius: 50% !important;
                    border:1px solid rgba(255,255,255,0.1);
                    background: rgba(255, 255, 255, 0.03); color:var(--text) !important; font-size:1.2rem;
                    cursor:pointer;transition:all 0.2s ease;
                    backdrop-filter: blur(4px); flex-shrink: 0;
                    padding: 0 !important;
                    box-shadow: none !important;
                    appearance: none !important;
                }
                .ss-regen-icon-btn:hover:not(:disabled) { background:rgba(255, 255, 255, 0.08);border-color:rgba(255,255,255,0.2); transform: none !important; }
                .ss-regen-icon-btn:active:not(:disabled) { transform: scale(0.95) !important; }
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
                .ss-markdown ul,.ss-markdown ol { padding-left:1.5rem;margin:0.75em 0; list-style: initial; }
                .ss-markdown li { margin-bottom:4px; display: list-item; }
                .ss-markdown code {
                    background:var(--hover-bg);border-radius:4px;
                    padding:2px 6px;font-size:0.875em;color:var(--accent);font-family:monospace;
                }
                .ss-markdown pre {
                    background:#0f172a;color:#f8fafc;border-radius:10px;
                    padding:20px;overflow-x:auto;margin:1em 0;
                    border: 1px solid var(--border);
                }
                .ss-markdown pre code { background:none;color:inherit;padding:0;font-size:0.875rem; display: block; }
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
                        width: 280px;
                        transform: translateX(-100%);
                        box-shadow: 4px 0 16px rgba(0,0,0,0.1);
                        overflow-x: hidden;
                    }
                    .ss-sidebar.mobile-open { transform: translateX(0); }
                    .ss-mobile-toggle, .ss-mobile-close { display: flex; }
                    .ss-mobile-overlay { display: block; top: 64px; pointer-events: none; }
                    .ss-mobile-overlay.open { pointer-events: auto; }
                    .ss-top-panel { padding: 0 16px; height: 76px; }
                    .ss-scroll-content { padding: 16px 16px 20px; min-width: 100vw; }
                    .ss-bottom-nav { flex-direction: column; }
                }

                /* COMMENT DRAWER */
                .ss-comment-drawer {
                    position: fixed;
                    top: 38px;
                    right: 0;
                    bottom: 0;
                    width: 400px;
                    height: calc(100vh - 38px);
                    background: var(--surface);
                    border-left: 1px solid var(--border);
                    box-shadow: -8px 0 32px rgba(0,0,0,0.5);
                    z-index: 900;
                    display: flex;
                    flex-direction: column;
                    transform: translateX(100%);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }
                .ss-comment-drawer.open { transform: translateX(0); }
                .ss-comment-drawer-header {
                    padding: 24px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .ss-comment-drawer-header h3 { font-size: 1.1rem; font-weight: 700; color: var(--text); margin: 0; }
                .ss-drawer-close { background: none; border: none !important; font-size: 1.2rem; color: #94a3b8; cursor: pointer; padding: 4px !important; border-radius: 6px; box-shadow: none !important; }
                .ss-drawer-close:hover { background: rgba(255,255,255,0.05); color: var(--text); }

                .ss-comment-list { flex: 1; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding: 24px; }
                .ss-comment-list::-webkit-scrollbar { width: 4px; }
                .ss-comment-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
                
                .ss-comment-item { display: flex; flex-direction: column; gap: 6px; padding: 12px 16px; border-radius: 12px; max-width: 90%; }
                .ss-comment-item.user { align-self: flex-end; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); }
                .ss-comment-item.ai { align-self: flex-start; background: rgba(30, 41, 59, 0.5); border: 1px solid var(--border); }
                
                .ss-comment-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
                .ss-comment-author { font-size: 0.75rem; font-weight: 700; color: var(--primary); }
                .ss-comment-item.ai .ss-comment-author { color: var(--accent); }
                .ss-comment-time { font-size: 0.65rem; color: #64748b; }
                
                .ss-comment-body { font-size: 0.875rem; color: #cbd5e1; line-height: 1.5; }
                .ss-comment-body p { margin: 0; }
                .ss-comment-body .ss-markdown { padding: 0; font-size: 0.875rem; line-height: 1.5; background: none; }
                
                .ss-no-comments { font-size: 0.85rem; color: #64748b; text-align: center; margin: 20px 0; font-style: italic; }
                
                .ss-comment-form { display: flex; flex-direction: column; gap: 12px; padding: 24px; border-top: 1px solid var(--border); background: rgba(15, 23, 42, 0.3); }
                .ss-comment-form textarea {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 12px;
                    color: var(--text);
                    font-size: 0.875rem;
                    resize: none;
                    min-height: 100px;
                    font-family: inherit;
                    transition: border-color 0.2s;
                }
                .ss-comment-form textarea:focus { outline: none; border-color: var(--primary); }
                .ss-comment-form button {
                    align-self: flex-end;
                    padding: 10px 24px;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, opacity 0.2s;
                }
                .ss-comment-form button:hover:not(:disabled) { transform: translateY(-1px); opacity: 0.9; }
                .ss-comment-form button:disabled { opacity: 0.5; cursor: not-allowed; }

                .ss-comments-toggle-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 50% !important;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255, 255, 255, 0.05);
                    color: #94a3b8 !important;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    position: relative;
                    padding: 0 !important;
                    box-shadow: none !important;
                    appearance: none !important;
                }
                .ss-comments-toggle-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); color: var(--text) !important; transform: none !important; }
                .ss-comments-toggle-btn.active { color: var(--primary) !important; border-color: var(--primary); background: rgba(16, 185, 129, 0.15); }
                .ss-comment-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: var(--primary);
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 700;
                    min-width: 16px;
                    height: 16px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    border: 2px solid var(--surface);
                }

                @media (max-width: 768px) {
                    .ss-comment-drawer { width: 100%; top: 64px; }
                }
            `}</style>
      <CustomModal
        isOpen={regenModalOpen}
        onClose={() => setRegenModalOpen(false)}
        onConfirm={confirmRegen}
        title="Regenerate Content"
        message="Are you sure you want to regenerate this content? Existing content will be replaced and cannot be undone."
        confirmLabel="Regenerate"
        isDanger
      />
    </div>
  );
}

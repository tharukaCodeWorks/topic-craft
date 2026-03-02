import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCourses = async () => {
    try {
      const data = await window.electron.courses.getCourses();
      setCourses(data);
      setError(null);
    } catch (error) {
      setError('Failed to load courses');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // Since generation runs in background, let's poll every 5s if any course lacks content
    const interval = setInterval(() => {
      fetchCourses();
    }, 5000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = () => {
    setTitle('');
    setCreateError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!creating) setModalOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await window.electron.courses.createCourse(title.trim());
      setModalOpen(false);
      fetchCourses();
    } catch (err) {
      setCreateError('Failed to create course. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      await window.electron.courses.deleteCourse(id);
      fetchCourses();
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <div className="courses-layout">
      <div className="courses-top-panel">
        <div className="courses-top-bar-inner">
          <h1 className="courses-title">Courses</h1>
          <button className="btn-new-course" onClick={openModal}>
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Course
          </button>
        </div>
      </div>

      <div className="courses-scroll-content">
        {error && (
          <div className="courses-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        {loading && courses.length === 0 ? (
          <div className="courses-loading">
            <div className="loading-spinner" />
            <span>Loading courses...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="courses-empty">
            <div className="empty-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <h3>No courses yet</h3>
            <p>
              Click "New Course" to create your first AI-powered learning path.
            </p>
            <button className="btn-empty-create" onClick={openModal}>
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Course
            </button>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course) => {
              const hasContent =
                course.mainsubjects && course.mainsubjects.length > 0;
              const isConfirming = confirmDeleteId === course.id;
              return (
                <Link
                  key={course.id}
                  to={
                    hasContent
                      ? `/courses/${course.id}/content/0/0`
                      : `/courses/${course.id}`
                  }
                  className="course-card"
                >
                  <div className="course-card-icon">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                      <polyline points="10 2 10 10 13 7 16 10 16 2" />
                    </svg>
                  </div>
                  <div className="course-card-body">
                    <h3 className="course-card-title">{course.coursetitle}</h3>
                    {hasContent ? (
                      <p className="course-card-meta">
                        {course.mainsubjects.length} subjects
                      </p>
                    ) : (
                      <p className="course-card-meta generating">
                        <span className="gen-dot" />
                        Generating curriculum...
                      </p>
                    )}
                  </div>

                  {isConfirming ? (
                    <div
                      className="delete-confirm"
                      onClick={(e) => e.preventDefault()}
                      onKeyDown={() => {}}
                      role="presentation"
                    >
                      <span className="delete-confirm-label">Delete?</span>
                      <button
                        type="button"
                        className="btn-confirm-yes"
                        onClick={(e) => handleDeleteConfirm(e, course.id)}
                        disabled={deleting}
                      >
                        {deleting ? '...' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        className="btn-confirm-no"
                        onClick={handleDeleteCancel}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-delete-card"
                      title="Delete course"
                      onClick={(e) => handleDeleteClick(e, course.id)}
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
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {modalOpen && (
          <div
            className="modal-backdrop"
            onClick={closeModal}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal();
            }}
            role="presentation"
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>New Course</h2>
                <p className="modal-desc">
                  What would you like to learn today?
                </p>
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label htmlFor="course-title">Course Title</label>
                  <input
                    id="course-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Modern Architecture"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={creating}
                    autoFocus
                  />
                </div>
                {createError && <p className="create-error">{createError}</p>}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={closeModal}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={creating || !title.trim()}
                  >
                    {creating ? 'Creating...' : 'Generate Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* Layout */
        .courses-layout {
            display: flex;
            flex-direction: column;
            gap: 0;
            height: calc(100vh - 86px);
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid var(--border);
            margin: -8px 0;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            background: var(--bg);
        }

        /* Top Panel */
        .courses-top-panel {
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
        .courses-top-panel::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.2) 30%, rgba(16,185,129,0.2) 70%, rgba(16,185,129,0) 100%);
        }

        .courses-top-bar-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .courses-title {
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--text);
            margin: 0;
            line-height: 1.3;
        }

        .courses-scroll-content {
            flex: 1;
            overflow-y: auto;
            padding: 32px;
            display: flex;
            flex-direction: column;
        }
        .courses-scroll-content::-webkit-scrollbar { width: 4px; }
        .courses-scroll-content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .btn-new-course {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 10px;
            border: 1px solid rgba(16, 185, 129, 0.3);
            background: rgba(16, 185, 129, 0.1);
            color: var(--primary);
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .btn-new-course:hover { 
            background: rgba(16, 185, 129, 0.2); 
            border-color: var(--primary);
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.15);
        }

        /* Error */
        .courses-error {
            background: rgba(220, 38, 38, 0.15);
            border: 1px solid rgba(220, 38, 38, 0.3);
            color: #fca5a5;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.875rem;
        }

        /* Loading */
        .courses-loading {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #94a3b8;
            font-size: 0.9rem;
            padding: 40px 0;
            justify-content: center;
            flex: 1;
        }
        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border);
            border-top-color: var(--primary);
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Empty */
        .courses-empty {
            text-align: center;
            padding: 60px 20px;
            color: #94a3b8;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .empty-icon { color: var(--border); margin-bottom: 16px; }
        .courses-empty h3 { font-size: 1.15rem; font-weight: 600; color: var(--text); margin: 0 0 8px; }
        .courses-empty p { font-size: 0.875rem; margin: 0 0 24px; }
        .btn-empty-create {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 24px;
            border-radius: 12px;
            border: 1px solid var(--primary);
            background: rgba(16, 185, 129, 0.15);
            color: var(--primary);
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .btn-empty-create:hover { background: rgba(16, 185, 129, 0.25); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2); }

        /* Grid */
        .courses-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }
        .course-card {
            display: flex;
            align-items: center;
            gap: 16px;
            background: var(--surface);
            border: 1px solid var(--border);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 16px;
            padding: 24px;
            text-decoration: none;
            color: var(--text);
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
            width: 100%;
            margin: 0;
            box-sizing: border-box;
        }
        .course-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0) 50%, rgba(16,185,129,0) 100%);
            transition: all 0.3s ease;
        }
        .course-card:hover {
            box-shadow: 0 12px 28px rgba(0,0,0,0.3);
            background: rgba(30, 41, 59, 0.7);
            border-color: rgba(16, 185, 129, 0.3);
            transform: translateY(-2px);
        }
        .course-card:hover::before {
            background: linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.5) 50%, rgba(16,185,129,0) 100%);
        }
        .course-card-icon {
            flex-shrink: 0;
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(16, 185, 129, 0.1);
            color: var(--primary);
            border: 1px solid rgba(16, 185, 129, 0.15);
            border-radius: 12px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .course-card-body { flex: 1; min-width: 0; display:flex; flex-direction:column; justify-content: center; }
        .course-card-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text);
            margin: 0 0 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
        }
        .course-card-meta {
            font-size: 0.8rem;
            color: #94a3b8;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }
        .course-card-meta.generating { color: #f59e0b; }
        .gen-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #f59e0b;
            animation: pulse 1.4s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
        }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.75); }
                }

        /* Delete button */
        .btn-delete-card {
            background: none;
            border: 1px solid transparent;
            font-size: 1rem;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            color: #64748b;
            flex-shrink: 0;
            opacity: 0;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .course-card:hover .btn-delete-card { opacity: 1; }
        .btn-delete-card:hover { 
            background: rgba(239, 68, 68, 0.1); 
            border-color: rgba(239, 68, 68, 0.3);
            color: #ef4444; 
        }

        /* Inline confirm */
        .delete-confirm {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(4px);
            padding: 6px 10px;
            border-radius: 10px;
            border: 1px solid var(--border);
        }
        .delete-confirm-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: #ef4444;
            white-space: nowrap;
            margin-right: 4px;
        }
        .btn-confirm-yes, .btn-confirm-no {
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.15s;
        }
        .btn-confirm-yes {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }
        .btn-confirm-yes:hover:not(:disabled) { background: rgba(239, 68, 68, 0.25); color: #ef4444; }
        .btn-confirm-yes:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-confirm-no {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
            color: #94a3b8;
        }
        .btn-confirm-no:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }

        /* Modal */
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: modalFadeIn 0.3s ease;
        }
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .modal {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 40px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 32px 64px -12px rgba(0,0,0,0.5);
            animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
        }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .modal-header {
            margin-bottom: 24px;
            text-align: center;
        }
        .modal-header h2 {
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.025em;
            color: var(--text);
            margin: 0 0 8px;
        }
        .modal-desc {
            font-size: 0.9rem;
            color: #94a3b8;
            line-height: 1.6;
            margin: 0;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        .form-group label {
            display: block;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 10px;
        }
        .form-input {
            width: 100%;
            padding: 14px 18px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            border-radius: 14px;
            font-size: 1rem;
            color: var(--text);
            transition: all 0.2s ease;
            box-sizing: border-box;
        }
        .form-input:focus {
            outline: none;
            border-color: var(--primary);
            background: rgba(255, 255, 255, 0.05);
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        .form-input::placeholder {
            color: #475569;
        }

        .modal-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 32px;
        }
        .btn-cancel, .btn-submit {
            padding: 14px;
            border-radius: 14px;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .btn-cancel {
            background: transparent;
            border-color: var(--border);
            color: #94a3b8;
        }
        .btn-cancel:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text);
        }
        .btn-submit {
            background: var(--primary);
            color: #ffffff;
            box-shadow: 0 8px 20px -4px rgba(16, 185, 129, 0.3);
        }
        .btn-submit:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px -2px rgba(16, 185, 129, 0.4);
            filter: brightness(1.1);
        }
        .btn-submit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        .create-error {
            color: #ef4444;
            font-size: 0.85rem;
            margin-top: 8px;
            text-align: center;
        }
    `}</style>
    </div>
  );
};

export default CoursesPage;

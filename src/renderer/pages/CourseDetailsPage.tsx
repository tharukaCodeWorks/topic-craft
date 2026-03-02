import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import generateCoursePdfAsBase64 from '../utils/pdfGenerator';

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

const CourseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenTopicIdx, setRegenTopicIdx] = useState<number | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchCourse = async () => {
    if (!id) return;
    try {
      const data = await window.electron.courses.getCourse(id);
      if (data) {
        setCourse(data);
        setError(null);
      } else {
        setError('Course not found');
      }
    } catch (err) {
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    const interval = setInterval(fetchCourse, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleRegenTopic = async (mIdx: number) => {
    if (!id || !course) return;
    setRegenTopicIdx(mIdx);
    const mainSubject = course.mainsubjects[mIdx];
    for (let sIdx = 0; sIdx < mainSubject.subsubjects.length; sIdx++) {
      await window.electron.courses.regenerateSubSubjectContent(id, mIdx, sIdx);
    }
    setRegenTopicIdx(null);
    fetchCourse();
  };

  const handleDownloadPdf = async () => {
    if (!course) return;
    setGeneratingPdf(true);
    try {
      const base64Data = await generateCoursePdfAsBase64(course);
      await window.electron.windowControls.savePdf(
        course.coursetitle,
        base64Data,
      );
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading)
    return (
      <div className="cd-loading">
        <div className="cd-spinner" />
        <span>Loading course...</span>
        <style>{`.cd-loading{display:flex;align-items:center;gap:12px;color:#6b7280;padding:60px;justify-content:center}.cd-spinner{width:22px;height:22px;border:2px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (error)
    return (
      <div className="cd-error">
        <p>⚠️ {error}</p>
        <Link to="/courses" className="cd-back-link">
          ← Back to Courses
        </Link>
        <style>{`.cd-error{text-align:center;padding:60px;color:#dc2626}.cd-back-link{display:inline-block;margin-top:16px;color:#6366f1;text-decoration:none;font-weight:500}.cd-back-link:hover{text-decoration:underline}`}</style>
      </div>
    );

  if (!course) return null;

  const totalSubs = (course.mainsubjects ?? []).reduce(
    (a, s) => a + (s.subsubjects?.length ?? 0),
    0,
  );
  const completedSubs = (course.mainsubjects ?? []).reduce(
    (a, s) => a + (s.subsubjects ?? []).filter((ss) => ss.content).length,
    0,
  );

  return (
    <div className="cd-page">
      {/* Breadcrumb */}
      <div className="cd-breadcrumb">
        <Link to="/courses" className="cd-breadcrumb-link">
          Courses
        </Link>
        <span className="cd-breadcrumb-sep">›</span>
        <span className="cd-breadcrumb-current">{course.coursetitle}</span>
      </div>

      <div className="cd-header-top">
        <h1 className="cd-title">{course.coursetitle}</h1>
        <button
          className="cd-download-pdf-btn"
          onClick={handleDownloadPdf}
          disabled={generatingPdf || totalSubs === 0}
          title="Save Course as PDF"
        >
          {generatingPdf ? (
            <>
              <span className="cd-regen-spinner" /> Saving...
            </>
          ) : (
            '📄 Save as PDF'
          )}
        </button>
      </div>

      {/* Progress bar */}
      {totalSubs > 0 && (
        <div className="cd-progress-wrap">
          <div className="cd-progress-label">
            <span>
              {completedSubs}/{totalSubs} topics generated
            </span>
            <span>{Math.round((completedSubs / totalSubs) * 100)}%</span>
          </div>
          <div
            className="cd-progress-bar"
            role="progressbar"
            aria-valuenow={Math.round((completedSubs / totalSubs) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="cd-progress-fill"
              style={{ width: `${(completedSubs / totalSubs) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Subjects */}
      <div className="cd-subjects">
        {(course.mainsubjects ?? []).map((subject, mIdx) => (
          <div key={mIdx} className="cd-subject-card">
            <div className="cd-subject-header">
              <div className="cd-subject-num">{mIdx + 1}</div>
              <h2 className="cd-subject-title">{subject.title}</h2>
              <button
                className="cd-regen-topic-btn"
                onClick={() => handleRegenTopic(mIdx)}
                disabled={regenTopicIdx === mIdx}
                title="Regenerate all content for this topic"
              >
                {regenTopicIdx === mIdx ? (
                  <span className="cd-regen-spinner" />
                ) : (
                  '↺'
                )}
              </button>
            </div>

            {subject.subsubjects && subject.subsubjects.length > 0 && (
              <ul className="cd-subsubjects">
                {subject.subsubjects.map((sub, sIdx) => {
                  const hasContent = !!sub.content;
                  return (
                    <li key={sIdx} className="cd-subsubject-item">
                      <Link
                        to={`/courses/${id}/content/${mIdx}/${sIdx}`}
                        className={`cd-sub-link ${hasContent ? 'has-content' : 'no-content'}`}
                      >
                        <span className="cd-sub-icon">
                          {hasContent ? '✅' : <span className="cd-gen-dot" />}
                        </span>
                        <span className="cd-sub-title">{sub.title}</span>
                        <span className="cd-sub-arrow">›</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <style>{`
                .cd-page { padding: 0; }

                .cd-breadcrumb { display:flex;align-items:center;gap:8px;margin-bottom:24px;font-size:0.875rem; }
                .cd-breadcrumb-link { color:var(--primary);text-decoration:none;font-weight:500; }
                .cd-breadcrumb-link:hover { text-decoration:underline; }
                .cd-breadcrumb-sep { color:#64748b; }
                .cd-breadcrumb-current { color:#94a3b8; }

                .cd-header-top { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:16px;flex-wrap:wrap; }
                .cd-title { font-size:2rem;font-weight:700;color:var(--text);margin:0;line-height:1.25;flex:1; }
                
                .cd-download-pdf-btn {
                    display:flex;align-items:center;gap:8px;
                    padding:10px 16px;border-radius:8px;
                    background:linear-gradient(135deg,var(--secondary),var(--primary));
                    color:#fff;font-size:0.9rem;font-weight:600;
                    border:none;cursor:pointer;transition:opacity 0.2s,transform 0.1s;
                    box-shadow:0 2px 4px rgba(16, 185, 129, 0.2);
                }
                .cd-download-pdf-btn:hover:not(:disabled) { opacity:0.9;transform:translateY(-1px); }
                .cd-download-pdf-btn:disabled { background:var(--hover-bg);cursor:not-allowed;box-shadow:none;color:#64748b; }

                /* Progress */
                .cd-progress-wrap { margin-bottom:28px; }
                .cd-progress-label { display:flex;justify-content:space-between;font-size:0.8rem;color:#94a3b8;margin-bottom:6px;font-weight:500; }
                .cd-progress-bar { height:6px;background:var(--border);border-radius:999px;overflow:hidden; }
                .cd-progress-fill { height:100%;background:linear-gradient(90deg,var(--secondary),var(--primary));border-radius:999px;transition:width 0.4s ease; }

                /* Subjects */
                .cd-subjects { display:flex;flex-direction:column;gap:16px; }
                .cd-subject-card { 
                    background:var(--surface);
                    border:1px solid var(--border);
                    border-radius:16px;
                    padding:24px;
                    box-shadow:0 4px 12px rgba(0,0,0,0.15);
                    transition:background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
                }
                .cd-subject-card:hover {
                    background:var(--hover-bg);
                    box-shadow:0 8px 24px rgba(0,0,0,0.25);
                    transform: translateY(-1px);
                }
                .cd-subject-header { display:flex;align-items:center;gap:12px;margin-bottom:14px; }
                .cd-subject-num { width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--secondary),var(--primary));color:#fff;font-weight:700;font-size:0.875rem;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
                .cd-subject-title { font-size:1.05rem;font-weight:600;color:var(--text);margin:0; }

                /* Sub-subjects list */
                .cd-subsubjects { list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px; }
                .cd-subsubject-item { display:flex; }
                .cd-sub-link {
                    display:flex;align-items:center;gap:10px;
                    flex:1;padding:12px 16px;border-radius:12px;
                    text-decoration:none;font-size:0.875rem;
                    background: transparent;
                    transition:background 0.15s,color 0.15s;
                }
                .cd-sub-link.has-content { color:var(--accent); }
                .cd-sub-link.has-content:hover { background:rgba(52, 211, 153, 0.15); }
                .cd-sub-link.no-content { color:#64748b; }
                .cd-sub-link.no-content:hover { background:var(--border);color:var(--text); }
                .cd-sub-icon { font-size:0.85rem;flex-shrink:0;display:flex;align-items:center; }
                .cd-gen-dot { display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;animation:pulse 1.2s ease-in-out infinite; }
                @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.75)}}
                .cd-sub-title { flex:1; }
                .cd-sub-arrow { color:#64748b;font-size:1rem;transition:transform 0.15s; }
                .cd-sub-link:hover .cd-sub-arrow { transform:translateX(3px); }

                /* Regen topic button */
                .cd-regen-topic-btn {
                    margin-left:auto;background:none;border:1.5px solid var(--border);
                    border-radius:7px;padding:4px 10px;font-size:0.85rem;font-weight:600;
                    cursor:pointer;color:#94a3b8;display:flex;align-items:center;gap:4px;
                    transition:background 0.15s,border-color 0.15s,color 0.15s;flex-shrink:0;
                }
                .cd-regen-topic-btn:hover:not(:disabled) { background:rgba(16, 185, 129, 0.1);border-color:var(--primary);color:var(--primary); }
                .cd-regen-topic-btn:disabled { opacity:0.5;cursor:not-allowed; }
                .cd-regen-spinner {
                    display:inline-block;width:12px;height:12px;
                    border:2px solid var(--border);border-top-color:var(--primary);
                    border-radius:50%;animation:spin 0.6s linear infinite;
                }
                @keyframes spin{to{transform:rotate(360deg)}}
            `}</style>
    </div>
  );
};

export default CourseDetailsPage;

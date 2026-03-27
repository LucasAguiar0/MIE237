import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API = (path) => `/api/admin${path}`;

// ── Utility ──────────────────────────────────────────────────────────────────
function useAdminAuth() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Probe a protected endpoint to see if session is alive
    axios.get(API('/results'), { withCredentials: true })
      .then(() => setChecked(true))
      .catch(() => navigate('/admin/login'));
  }, [navigate]);

  return checked;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const authed = useAdminAuth();
  const [activeTab, setActiveTab] = useState('images');

  async function handleLogout() {
    await axios.post(API('/logout'), {}, { withCredentials: true });
    navigate('/admin/login');
  }

  if (!authed) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="admin-nav-brand">MIE237 Dashboard</div>
        <div className="admin-nav-tabs">
          {[
            { id: 'images',     label: 'Images' },
            { id: 'cheatsheet', label: 'Cheat Sheet' },
            { id: 'results',    label: 'Results' },
            { id: 'stats',      label: 'Aggregate Stats' },
            { id: 'settings',   label: 'Settings' },
          ].map((t) => (
            <button
              key={t.id}
              className={`admin-nav-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm admin-logout" onClick={handleLogout}>
          Log Out
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'images'     && <ImagesTab />}
        {activeTab === 'cheatsheet' && <CheatSheetTab />}
        {activeTab === 'results'    && <ResultsTab />}
        {activeTab === 'stats'      && <StatsTab />}
        {activeTab === 'settings'   && <SettingsTab />}
      </main>
    </div>
  );
}

// ── Images Tab ────────────────────────────────────────────────────────────────
function ImagesTab() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload form state
  const [file, setFile] = useState(null);
  const [imgName, setImgName] = useState('');
  const [imgCategory, setImgCategory] = useState('');
  const [imgIsAI, setImgIsAI] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    axios.get(API('/images'), { withCredentials: true })
      .then((r) => setImages(r.data.images))
      .catch(() => setError('Failed to load images.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function handleUpload(e) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!file) return setError('Please select an image file.');
    if (!imgName.trim()) return setError('Image name is required.');
    if (!imgCategory) return setError('Category is required.');
    if (imgIsAI === '') return setError('Is_AI field is required.');

    const fd = new FormData();
    fd.append('image', file);
    fd.append('name', imgName.trim());
    fd.append('category', imgCategory);
    fd.append('is_ai', imgIsAI);

    setUploading(true);
    try {
      await axios.post(API('/upload-image'), fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Image uploaded successfully.');
      setFile(null); setImgName(''); setImgCategory(''); setImgIsAI('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete image "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(API(`/image/${id}`), { withCredentials: true });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed.');
    }
  }

  const people = images.filter((i) => i.category === 'People');
  const landscape = images.filter((i) => i.category === 'Landscape');

  return (
    <div>
      <h2 className="tab-title">Image Management</h2>

      {/* ── Upload form ── */}
      <div className="card mb-3">
        <h3 className="mb-2">Upload New Image</h3>
        <form onSubmit={handleUpload}>
          <div className="upload-grid">
            <div className="form-group">
              <label>Image File *</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => setFile(e.target.files[0] || null)}
              />
            </div>
            <div className="form-group">
              <label>Image Name / ID *</label>
              <input
                type="text"
                placeholder="e.g. people_ai_001"
                value={imgName}
                onChange={(e) => setImgName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={imgCategory} onChange={(e) => setImgCategory(e.target.value)}>
                <option value="">Select…</option>
                <option value="People">People</option>
                <option value="Landscape">Landscape</option>
              </select>
            </div>
            <div className="form-group">
              <label>Is AI-Generated? *</label>
              <select value={imgIsAI} onChange={(e) => setImgIsAI(e.target.value)}>
                <option value="">Select…</option>
                <option value="1">Yes (AI-generated)</option>
                <option value="0">No (Real image)</option>
              </select>
            </div>
          </div>

          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Image'}
          </button>
        </form>
      </div>

      {/* ── Image library ── */}
      {loading ? (
        <div className="flex items-center gap-2"><div className="spinner" style={{width:24,height:24,borderWidth:3}} /><span>Loading…</span></div>
      ) : (
        <>
          <ImageCategory
            title="People"
            images={people}
            onDelete={handleDelete}
          />
          <ImageCategory
            title="Landscape"
            images={landscape}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}

function ImageCategory({ title, images, onDelete }) {
  return (
    <div className="card mb-2">
      <div className="flex justify-between items-center mb-2">
        <h3>{title} <span className="badge badge-gray">{images.length}</span></h3>
      </div>
      {images.length === 0 ? (
        <p className="muted">No {title.toLowerCase()} images uploaded yet.</p>
      ) : (
        <div className="image-grid">
          {images.map((img) => (
            <div key={img.id} className="image-thumb-card">
              <div className="image-thumb-wrap">
                <img src={img.file_path} alt={img.name} />
              </div>
              <div className="image-thumb-info">
                <span className="image-thumb-name" title={img.name}>{img.name}</span>
                <span className={`badge ${img.is_ai === 1 ? 'badge-blue' : 'badge-green'}`}>
                  {img.is_ai === 1 ? 'AI' : 'Real'}
                </span>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(img.id, img.name)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Cheat Sheet Tab ────────────────────────────────────────────────────────────
function CheatSheetTab() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(API('/cheatsheet'), { withCredentials: true })
      .then((r) => setContent(r.data.content || ''))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await axios.put(API('/cheatsheet'), { content }, { withCredentials: true });
      setSuccess('Cheat sheet saved.');
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="tab-title">Cheat Sheet Editor</h2>
      <div className="card">
        <p className="muted mb-2">
          This content is displayed to participants who opted to use the cheat sheet.
          Plain text is recommended; use newlines for formatting.
        </p>
        {loading ? (
          <div className="spinner" />
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Cheat Sheet Content</label>
              <textarea
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            {error   && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Cheat Sheet'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Results Tab ───────────────────────────────────────────────────────────────
function ResultsTab() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    axios.get(API('/results'), { withCredentials: true })
      .then((r) => setParticipants(r.data.participants))
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(p) {
    setSelected(p);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const r = await axios.get(API(`/results/${p.id}`), { withCredentials: true });
      setDetail(r.data);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleExport(userId) {
    window.open(`/api/admin/export/${userId}`, '_blank');
  }

  function handleExportAll() {
    window.open('/api/admin/export-all', '_blank');
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2" style={{flexWrap:'wrap',gap:12}}>
        <h2 className="tab-title" style={{margin:0}}>Participant Results</h2>
        <button className="btn btn-outline btn-sm" onClick={handleExportAll}>
          Export All as CSV
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : participants.length === 0 ? (
        <div className="card"><p className="muted">No participants yet.</p></div>
      ) : (
        <div className="card table-wrap mb-3">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Cheat Sheet</th>
                <th>Images</th>
                <th>Accuracy</th>
                <th>Mean RT (ms)</th>
                <th>Completed</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="badge badge-blue">{p.category_selected}</span></td>
                  <td>
                    <span className={`badge ${p.cheat_sheet_used ? 'badge-yellow' : 'badge-gray'}`}>
                      {p.cheat_sheet_used ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{p.total_responses}</td>
                  <td>{p.total_responses > 0 ? `${p.accuracy_pct}%` : '—'}</td>
                  <td>{p.total_responses > 0 ? p.mean_reaction_time_ms : '—'}</td>
                  <td>
                    <span className={`badge ${p.completed ? 'badge-green' : 'badge-red'}`}>
                      {p.completed ? 'Yes' : 'Incomplete'}
                    </span>
                  </td>
                  <td style={{whiteSpace:'nowrap'}}>{new Date(p.timestamp).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openDetail(p)}>
                        View
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleExport(p.id)}>
                        CSV
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail panel ── */}
      {selected && (
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <h3>Detail: {selected.name}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close ✕</button>
          </div>

          {loadingDetail ? (
            <div className="spinner" />
          ) : detail ? (
            <>
              <div className="detail-stats mb-2">
                <div className="detail-stat">
                  <span className="detail-stat-label">Accuracy</span>
                  <span className="detail-stat-value">
                    {detail.responses.length > 0
                      ? `${Math.round((detail.responses.filter(r=>r.correct).length / detail.responses.length) * 100)}%`
                      : '—'}
                  </span>
                </div>
                <div className="detail-stat">
                  <span className="detail-stat-label">Mean RT</span>
                  <span className="detail-stat-value">
                    {detail.responses.length > 0
                      ? `${Math.round(detail.responses.reduce((a,r)=>a+r.reaction_time,0)/detail.responses.length)} ms`
                      : '—'}
                  </span>
                </div>
                <div className="detail-stat">
                  <span className="detail-stat-label">Total Images</span>
                  <span className="detail-stat-value">{detail.responses.length}</span>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Image ID</th>
                      <th>Category</th>
                      <th>Is AI</th>
                      <th>Response</th>
                      <th>Correct</th>
                      <th>RT (ms)</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.responses.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.image_name}</td>
                        <td>{r.category}</td>
                        <td>
                          <span className={`badge ${r.is_ai ? 'badge-blue' : 'badge-green'}`}>
                            {r.is_ai ? 'AI' : 'Real'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${r.participant_classification ? 'badge-blue' : 'badge-green'}`}>
                            {r.participant_classification ? 'AI' : 'Real'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${r.correct ? 'badge-green' : 'badge-red'}`}>
                            {r.correct ? '✓' : '✗'}
                          </span>
                        </td>
                        <td>{r.reaction_time}</td>
                        <td style={{whiteSpace:'nowrap'}}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Aggregate Stats Tab ────────────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API('/aggregated-stats'), { withCredentials: true })
      .then((r) => setStats(r.data.stats))
      .finally(() => setLoading(false));
  }, []);

  const conditions = [
    { category: 'People',    cheat: 0, label: 'People — No Cheat Sheet' },
    { category: 'People',    cheat: 1, label: 'People — Cheat Sheet' },
    { category: 'Landscape', cheat: 0, label: 'Landscape — No Cheat Sheet' },
    { category: 'Landscape', cheat: 1, label: 'Landscape — Cheat Sheet' },
  ];

  function find(category, cheat) {
    return stats.find(
      (s) => s.category_selected === category && Number(s.cheat_sheet_used) === cheat
    );
  }

  return (
    <div>
      <h2 className="tab-title">Aggregated Statistics</h2>
      <p className="muted mb-2">Only completed experiments are included.</p>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="stats-grid">
          {conditions.map((c) => {
            const row = find(c.category, c.cheat);
            return (
              <div key={c.label} className="card stats-card">
                <div className="stats-card-title">{c.label}</div>
                <div className="stats-card-value">
                  {row ? row.participant_count : 0}
                  <span className="stats-card-unit">participants</span>
                </div>
                <div className="stats-card-extra">
                  {row ? (
                    <>
                      <span>Accuracy: <strong>{row.overall_accuracy_pct}%</strong></span>
                      <span>Mean RT: <strong>{row.mean_reaction_time_ms} ms</strong></span>
                    </>
                  ) : (
                    <span className="muted">No data yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-3">
        <h3 className="mb-2">Condition Matrix</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Condition</th>
                <th>Participants</th>
                <th>Overall Accuracy</th>
                <th>Mean Reaction Time</th>
              </tr>
            </thead>
            <tbody>
              {conditions.map((c) => {
                const row = find(c.category, c.cheat);
                return (
                  <tr key={c.label}>
                    <td>{c.label}</td>
                    <td>{row ? row.participant_count : 0}</td>
                    <td>{row ? `${row.overall_accuracy_pct}%` : '—'}</td>
                    <td>{row ? `${row.mean_reaction_time_ms} ms` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab() {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (newPwd !== confirmPwd) {
      return setError('New passwords do not match.');
    }
    if (newPwd.length < 8) {
      return setError('New password must be at least 8 characters.');
    }

    setSaving(true);
    try {
      await axios.post(API('/change-password'), {
        currentPassword: currentPwd,
        newPassword: newPwd,
      }, { withCredentials: true });
      setSuccess('Password changed successfully.');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="tab-title">Settings</h2>
      <div className="card" style={{ maxWidth: 480 }}>
        <h3 className="mb-2">Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

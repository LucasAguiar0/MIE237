import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CheatSheet.css';

export default function CheatSheet() {
  const [content, setContent] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/cheatsheet')
      .then((res) => setContent(res.data.content || ''))
      .catch(() => setContent('(Could not load cheat sheet)'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside className={`cheatsheet-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="cheatsheet-header" onClick={() => setCollapsed((c) => !c)}>
        <span className="cheatsheet-title">Cheat Sheet</span>
        <span className="cheatsheet-toggle">{collapsed ? '▶' : '▼'}</span>
      </div>

      {!collapsed && (
        <div className="cheatsheet-body">
          {loading
            ? <p className="muted">Loading…</p>
            : <pre className="cheatsheet-content">{content}</pre>
          }
        </div>
      )}
    </aside>
  );
}

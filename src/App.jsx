import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, History as HistoryIcon, Plus, Save, Activity, Sun, Moon, LogOut, Award } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, increment } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './Auth';

function CounterApp({ type, title, userId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counter, setCounter] = useState(null);
  const [history, setHistory] = useState([]);
  const [editTarget, setEditTarget] = useState('');
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('counter');

  const fetchTotal = async () => {
    try {
      const q = query(collection(db, 'users', userId, 'counters', type, 'days'));
      const snapshot = await getDocs(q);
      let total = 0;
      snapshot.forEach(doc => { total += doc.data().count || 0; });
      setTotalCount(total);
    } catch (err) {
      console.error('Error fetching total:', err);
    }
  };

  const fetchToday = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'users', userId, 'counters', type, 'days', todayStr);
      const docSnap = await getDoc(docRef);

      let currentCounter;
      if (docSnap.exists()) {
        currentCounter = docSnap.data();
      } else {
        const daysRef = collection(db, 'users', userId, 'counters', type, 'days');
        const q = query(daysRef, where("date", "<", todayStr), orderBy("date", "desc"), limit(1));
        const pastSnap = await getDocs(q);

        let target = 10;
        let carriedOver = 0;

        if (!pastSnap.empty) {
          const last = pastSnap.docs[0].data();
          target = last.target;
          carriedOver = Math.max(0, (last.target + (last.carriedOver || 0)) - last.count);
        }

        currentCounter = { date: todayStr, target, count: 0, carriedOver };
        await setDoc(docRef, currentCounter);
      }

      setCounter(currentCounter);
      if (currentCounter.target !== undefined) {
        setEditTarget(currentCounter.target.toString());
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching today counter:', err);
      setError('Failed to connect to Firebase Database. Please check your config.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const q = query(collection(db, 'users', userId, 'counters', type, 'days'), orderBy("date", "desc"), limit(30));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data());
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    fetchToday();
    fetchTotal();
  }, []);

  useEffect(() => {
    if (counter) {
      fetchHistory();
    }
  }, [counter?.date]);

  const handleIncrement = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'users', userId, 'counters', type, 'days', todayStr);
      await updateDoc(docRef, { count: increment(1) });
      setCounter(prev => ({ ...prev, count: prev.count + 1 }));
      setTotalCount(prev => prev + 1);
      fetchHistory();
    } catch (err) {
      console.error('Error incrementing:', err);
    }
  };

  const handleSaveTarget = async () => {
    try {
      const targetVal = parseInt(editTarget, 10);
      if (isNaN(targetVal)) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'users', userId, 'counters', type, 'days', todayStr);
      await updateDoc(docRef, { target: targetVal });
      
      setCounter(prev => ({ ...prev, target: targetVal }));
      setIsEditingTarget(false);
    } catch (err) {
      console.error('Error updating target:', err);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading your counter...</p>
      </div>
    );
  }

  if (error || !counter) {
    return (
      <div className="loading" style={{ color: 'var(--danger-color)' }}>
        <p>{error || 'Counter data is unavailable.'}</p>
        <button className="btn-small" onClick={() => { setLoading(true); fetchToday(); }}>Retry</button>
      </div>
    );
  }

  // Calculate total target and remaining
  const totalTarget = counter.target + counter.carriedOver;
  const remaining = Math.max(0, totalTarget - counter.count);

  return (
    <div className="glass-panel">
      <div className="header">
        <h1>{title}</h1>
        <p>Stay on track, everyday.</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'counter' ? 'active' : ''}`}
          onClick={() => setActiveTab('counter')}
        >
          Counter
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'counter' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}>
            <div className="stat-card" style={{ width: '100%' }}>
              <div className="stat-label" style={{ justifyContent: 'center' }}>
                <Award size={16} /> Total Lifetime Count
              </div>
              <div className="stat-value highlight" style={{ color: 'var(--accent-color)' }}>
                {totalCount}
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">
                <TrendingUp size={16} /> Today's Count
              </div>
              <div className="stat-value highlight">{counter.count}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <Target size={16} /> Today's Target
              </div>
              <div className="stat-value">
                {totalTarget}
              </div>
              {counter.carriedOver > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 'normal' }}>
                  ({counter.target} base + {counter.carriedOver} past)
                </div>
              )}
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <Activity size={16} /> Left Count
              </div>
              <div className={`stat-value ${remaining === 0 ? 'success' : ''}`}>
                {remaining}
              </div>
            </div>
          </div>

          <div className="controls">
            <button className="btn-main" onClick={handleIncrement}>
              <Plus size={36} />
              <span>Count</span>
            </button>

            <div className="target-setter">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Daily Target:</span>
              {isEditingTarget ? (
                <>
                  <input
                    type="number"
                    value={editTarget}
                    onChange={e => setEditTarget(e.target.value)}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveTarget()}
                  />
                  <button className="btn-small" onClick={handleSaveTarget}>
                    <Save size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{counter.target}</span>
                  <button className="btn-small" onClick={() => setIsEditingTarget(true)}>
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && history.length > 0 && (
        <div className="history-section">
          <div className="history-title">
            <HistoryIcon size={20} /> History
          </div>
          <div className="history-list">
            {history.map(item => {
              const itemTotalTarget = item.target + item.carriedOver;
              const itemRemaining = Math.max(0, itemTotalTarget - item.count);
              return (
                <div className="history-item" key={item.date}>
                  <div className="history-date">
                    {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="history-stats">
                    <span>Target: <span className="strong">{item.target}</span></span>
                    <span>Count: <span className="strong">{item.count}</span></span>
                    {itemRemaining > 0 ? (
                      <span style={{ color: 'var(--danger-color)' }}>Left: {itemRemaining}</span>
                    ) : (
                      <span style={{ color: 'var(--success-color)' }}>Completed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'history' && history.length === 0 && (
        <div className="history-section" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>No history available yet.</p>
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeCounter, setActiveCounter] = useState('janmangal');
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (authLoading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      <div className="top-nav">
        <div className="nav-buttons">
          <button 
            className={`nav-btn ${activeCounter === 'janmangal' ? 'active' : ''}`}
            onClick={() => setActiveCounter('janmangal')}
          >
            Janmangal
          </button>
          <button 
            className={`nav-btn ${activeCounter === 'malajaap' ? 'active' : ''}`}
            onClick={() => setActiveCounter('malajaap')}
          >
            Malajaap
          </button>
        </div>
        <div className="nav-actions">
          <span className="user-email" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem', fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 10px var(--accent-glow)' }} />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 10px var(--accent-glow)' }}>
                {(user.displayName || (user.email ? user.email : 'U')).charAt(0).toUpperCase()}
              </div>
            )}
            {user.displayName || (user.email ? user.email.split('@')[0] : 'User')}
          </span>
          <button 
            className="action-btn" 
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            className="action-btn logout-btn" 
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {activeCounter === 'janmangal' && <CounterApp key={`janmangal-${user.uid}`} type="janmangal" title="Janmangal Counter" userId={user.uid} />}
      {activeCounter === 'malajaap' && <CounterApp key={`malajaap-${user.uid}`} type="malajaap" title="Malajaap Counter" userId={user.uid} />}
    </div>
  );
}

export default App;

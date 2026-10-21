import React, { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  History as HistoryIcon, 
  Plus, 
  Activity, 
  LogOut, 
  Award, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  increment 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './Auth';
import Settings from './Settings';
import { soundFX, triggerHaptic } from './utils/audio';
import { applyThemeAndAccent } from './utils/theme';

function CounterApp({ type, title, userId, settings }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [counter, setCounter] = useState(null);
  const [history, setHistory] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('counter');

  const defaultGoal = type === 'janmangal' 
    ? (settings?.targetJanmangal || 10) 
    : (settings?.targetMalajaap || 11);

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

        let target = defaultGoal;
        let carriedOver = 0;

        if (!pastSnap.empty) {
          const last = pastSnap.docs[0].data();
          target = last.target || defaultGoal;
          
          if (settings?.carryOverIncomplete !== false) {
            carriedOver = Math.max(0, (last.target + (last.carriedOver || 0)) - last.count);
          }
        }

        currentCounter = { date: todayStr, target, count: 0, carriedOver };
        await setDoc(docRef, currentCounter);
      }

      setCounter(currentCounter);
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
  }, [type, userId]);

  useEffect(() => {
    if (counter) {
      fetchHistory();
    }
  }, [counter?.date]);

  const handleIncrement = async () => {
    try {
      // Haptic feedback FIRST (55ms overcomes motor inertia)
      if (settings?.hapticEnabled !== false) {
        triggerHaptic(55);
      }

      // Audio feedback
      if (settings?.soundEnabled !== false) {
        soundFX.playByType(settings?.soundType || 'bead');
      }

      const totalTarget = counter.target + (counter.carriedOver || 0);
      const newCount = counter.count + 1;

      // Target achievement celebration
      if (newCount === totalTarget && settings?.celebrationSound !== false) {
        soundFX.playTargetComplete();
      }

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
  const totalTarget = counter.target + (counter.carriedOver || 0);
  const remaining = Math.max(0, totalTarget - counter.count);

  return (
    <div className="glass-panel">
      <div className="header">
        <h1>{title}</h1>
        <p>Stay on track, everyday.</p>
      </div>

      <div className="tabs">
        <button
          id="counter-tab-btn"
          className={`tab ${activeTab === 'counter' ? 'active' : ''}`}
          onClick={() => setActiveTab('counter')}
        >
          Counter
        </button>
        <button
          id="history-tab-btn"
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
            <button 
              id="main-count-btn" 
              className="btn-main" 
              onClick={handleIncrement}
              onTouchStart={() => {
                if (settings?.hapticEnabled !== false) {
                  triggerHaptic(55);
                }
              }}
            >
              <Plus size={36} />
              <span>Count</span>
            </button>
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
              const itemTotalTarget = item.target + (item.carriedOver || 0);
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

const DEFAULT_SETTINGS = {
  theme: localStorage.getItem('webcounter_theme') || 'dark',
  accent: localStorage.getItem('webcounter_accent') || 'blue',
  targetJanmangal: 10,
  targetMalajaap: 11,
  soundEnabled: true,
  soundType: 'bead',
  hapticEnabled: true,
  celebrationSound: true,
  carryOverIncomplete: true,
};

function App() {
  const [activeCounter, setActiveCounter] = useState('janmangal'); // 'janmangal' | 'malajaap' | 'settings'
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('webcounter_settings');
      return cached ? { ...DEFAULT_SETTINGS, ...JSON.parse(cached) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  // Apply theme & accent variables dynamically
  useEffect(() => {
    applyThemeAndAccent(settings.theme, settings.accent);
    localStorage.setItem('webcounter_theme', settings.theme);
    localStorage.setItem('webcounter_accent', settings.accent);
    localStorage.setItem('webcounter_settings', JSON.stringify(settings));
  }, [settings.theme, settings.accent]);

  // Auth observer and settings fetcher
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        try {
          const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
          const snap = await getDoc(settingsRef);
          if (snap.exists()) {
            const data = snap.data();
            setSettings(prev => ({ ...prev, ...data }));
            if (data.theme || data.accent) {
              applyThemeAndAccent(data.theme || settings.theme, data.accent || settings.accent);
            }
          }
        } catch (err) {
          console.warn('Could not load remote user preferences:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

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
            id="nav-janmangal-btn"
            className={`nav-btn ${activeCounter === 'janmangal' ? 'active' : ''}`}
            onClick={() => setActiveCounter('janmangal')}
          >
            Janmangal
          </button>
          <button 
            id="nav-malajaap-btn"
            className={`nav-btn ${activeCounter === 'malajaap' ? 'active' : ''}`}
            onClick={() => setActiveCounter('malajaap')}
          >
            Malajaap
          </button>
          <button 
            id="nav-settings-btn"
            className={`nav-btn ${activeCounter === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveCounter('settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <SettingsIcon size={16} />
            <span>Settings</span>
          </button>
        </div>

        <div className="nav-actions">
          {/* User Profile Chip - Clicking directly opens Settings */}
          <div 
            id="nav-user-profile-chip"
            className="user-profile-chip" 
            onClick={() => setActiveCounter('settings')}
            title="User Settings & Profile"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.25rem', fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-primary)' }}
          >
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 10px var(--accent-glow)' }} 
              />
            ) : (
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 10px var(--accent-glow)' }}>
                {(user.displayName || (user.email ? user.email : 'U')).charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName || (user.email ? user.email.split('@')[0] : 'User')}
            </span>
          </div>

          {/* Logout Button */}
          <button 
            id="nav-logout-btn"
            className="action-btn logout-btn" 
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Views */}
      {activeCounter === 'settings' && (
        <Settings 
          user={user} 
          onBack={() => setActiveCounter('janmangal')}
          onUserUpdate={(updatedUser) => setUser(updatedUser)}
          currentSettings={settings}
          onSettingsSave={(newSettings) => setSettings(newSettings)}
        />
      )}

      {activeCounter === 'janmangal' && (
        <CounterApp 
          key={`janmangal-${user.uid}`} 
          type="janmangal" 
          title="Janmangal Counter" 
          userId={user.uid} 
          settings={settings}
        />
      )}

      {activeCounter === 'malajaap' && (
        <CounterApp 
          key={`malajaap-${user.uid}`} 
          type="malajaap" 
          title="Malajaap Counter" 
          userId={user.uid} 
          settings={settings}
        />
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Palette, 
  Target, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Check, 
  Save, 
  RotateCcw, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Flame, 
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon
} from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { soundFX, triggerHaptic } from './utils/audio';
import { ACCENT_PALETTES, applyThemeAndAccent } from './utils/theme';

// Curated avatar presets with spiritual and serene designs
const AVATAR_PRESETS = [
  { id: 'preset-1', name: 'Saffron Aura', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80' },
  { id: 'preset-2', name: 'Lotus Peace', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=150&q=80' },
  { id: 'preset-3', name: 'Meditation Dawn', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=150&q=80' },
  { id: 'preset-4', name: 'Sacred Flame', url: 'https://images.unsplash.com/photo-1608848461950-0fe51dfc41cb?auto=format&fit=crop&w=150&q=80' },
  { id: 'preset-5', name: 'Temple Bells', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=150&q=80' },
];

const ACCENT_OPTIONS = Object.values(ACCENT_PALETTES);

export default function Settings({ user, onBack, onUserUpdate, currentSettings, onSettingsSave }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Profile fields
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [customAvatarInput, setCustomAvatarInput] = useState(user.photoURL || '');

  // Target fields
  const [targetJanmangal, setTargetJanmangal] = useState(currentSettings?.targetJanmangal || 10);
  const [targetMalajaap, setTargetMalajaap] = useState(currentSettings?.targetMalajaap || 11);
  const [updateTodayImmediately, setUpdateTodayImmediately] = useState(true);
  const [carryOverIncomplete, setCarryOverIncomplete] = useState(
    currentSettings?.carryOverIncomplete !== undefined ? currentSettings.carryOverIncomplete : true
  );

  // Theme & Appearance fields
  const [theme, setTheme] = useState(currentSettings?.theme || 'dark');
  const [accent, setAccent] = useState(currentSettings?.accent || 'blue');

  // Audio & Haptics fields
  const [soundEnabled, setSoundEnabled] = useState(
    currentSettings?.soundEnabled !== undefined ? currentSettings.soundEnabled : true
  );
  const [soundType, setSoundType] = useState(currentSettings?.soundType || 'bead');
  const [hapticEnabled, setHapticEnabled] = useState(
    currentSettings?.hapticEnabled !== undefined ? currentSettings.hapticEnabled : true
  );
  const [celebrationSound, setCelebrationSound] = useState(
    currentSettings?.celebrationSound !== undefined ? currentSettings.celebrationSound : true
  );

  // Reset confirmation modal state
  const [resetModalType, setResetModalType] = useState(null); // 'janmangal' | 'malajaap' | null

  // Current accent palette data for styling
  const currentAccentData = ACCENT_PALETTES[accent] || ACCENT_PALETTES.blue;

  // On mount or when props change, ensure theme and accent are applied
  useEffect(() => {
    applyThemeAndAccent(theme, accent);
  }, [theme, accent]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Immediate theme change
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyThemeAndAccent(newTheme, accent);
    localStorage.setItem('webcounter_theme', newTheme);
    if (onSettingsSave) {
      onSettingsSave({
        ...currentSettings,
        theme: newTheme,
        accent
      });
    }
  };

  // Immediate accent change
  const handleAccentChange = (newAccent) => {
    setAccent(newAccent);
    applyThemeAndAccent(theme, newAccent);
    localStorage.setItem('webcounter_accent', newAccent);
    if (onSettingsSave) {
      onSettingsSave({
        ...currentSettings,
        theme,
        accent: newAccent
      });
    }
  };

  const handleTestSound = (type = soundType) => {
    soundFX.playByType(type);
  };

  const handleTestHaptic = () => {
    triggerHaptic(50);
    showToast('Haptic feedback triggered (on mobile devices)', 'info');
  };

  // Save profile updates
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const trimmedName = displayName.trim();
      const updatedPhoto = photoURL.trim() || null;

      await updateProfile(auth.currentUser, {
        displayName: trimmedName || null,
        photoURL: updatedPhoto
      });

      // Update parent user state
      if (onUserUpdate) {
        onUserUpdate({
          ...auth.currentUser,
          displayName: trimmedName,
          photoURL: updatedPhoto
        });
      }

      // Also persist to firestore user doc
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        displayName: trimmedName,
        photoURL: updatedPhoto,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      showToast('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Target settings
  const handleSaveTargets = async () => {
    setSaving(true);
    try {
      const janmangalVal = Math.max(1, parseInt(targetJanmangal, 10) || 10);
      const malajaapVal = Math.max(1, parseInt(targetMalajaap, 10) || 11);

      const newSettings = {
        ...currentSettings,
        targetJanmangal: janmangalVal,
        targetMalajaap: malajaapVal,
        carryOverIncomplete
      };

      // If user chose to update today's active counter target immediately
      if (updateTodayImmediately) {
        const todayStr = new Date().toISOString().split('T')[0];
        try {
          const janmangalRef = doc(db, 'users', user.uid, 'counters', 'janmangal', 'days', todayStr);
          await setDoc(janmangalRef, { target: janmangalVal }, { merge: true });
        } catch (e) {
          console.warn('Could not update today janmangal doc:', e);
        }

        try {
          const malajaapRef = doc(db, 'users', user.uid, 'counters', 'malajaap', 'days', todayStr);
          await setDoc(malajaapRef, { target: malajaapVal }, { merge: true });
        } catch (e) {
          console.warn('Could not update today malajaap doc:', e);
        }
      }

      // Save preferences to Firestore & LocalStorage
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, newSettings, { merge: true });

      if (onSettingsSave) {
        onSettingsSave(newSettings);
      }

      showToast('Target settings saved successfully!');
    } catch (err) {
      console.error('Error saving targets:', err);
      showToast('Failed to save target settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Theme & Audio settings to Firestore
  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const newSettings = {
        ...currentSettings,
        theme,
        accent,
        soundEnabled,
        soundType,
        hapticEnabled,
        celebrationSound
      };

      const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(settingsRef, newSettings, { merge: true });

      if (onSettingsSave) {
        onSettingsSave(newSettings);
      }

      showToast('Theme & Preferences saved successfully!');
    } catch (err) {
      console.error('Error saving preferences:', err);
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset today's count for specific counter
  const handleResetCount = async (type) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const docRef = doc(db, 'users', user.uid, 'counters', type, 'days', todayStr);
      await updateDoc(docRef, { count: 0 });
      setResetModalType(null);
      showToast(`Today's ${type === 'janmangal' ? 'Janmangal' : 'Malajaap'} count reset to 0!`);
    } catch (err) {
      console.error('Error resetting count:', err);
      showToast('Failed to reset counter. Ensure count entry exists for today.', 'error');
    }
  };

  return (
    <div className="glass-panel settings-panel">
      {/* Toast Notification */}
      {notification && (
        <div className={`settings-toast toast-${notification.type}`}>
          {notification.type === 'success' && <CheckCircle2 size={18} />}
          {notification.type === 'error' && <AlertTriangle size={18} />}
          {notification.type === 'info' && <Info size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Settings Header */}
      <div className="settings-header">
        <div className="settings-title-row">
          <button 
            className="btn-back" 
            onClick={onBack} 
            title="Return to Counter"
            id="settings-back-btn"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h2>User Settings</h2>
          <div style={{ width: '70px' }} />
        </div>
        <p className="settings-subtitle">Manage your profile, target counts, themes, and counting experience</p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="settings-nav-tabs">
        <button
          id="tab-profile-btn"
          className={`settings-nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} />
          <span>Profile</span>
        </button>
        <button
          id="tab-targets-btn"
          className={`settings-nav-tab ${activeTab === 'targets' ? 'active' : ''}`}
          onClick={() => setActiveTab('targets')}
        >
          <Target size={18} />
          <span>Targets</span>
        </button>
        <button
          id="tab-appearance-btn"
          className={`settings-nav-tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          <Palette size={18} />
          <span>Theme</span>
        </button>
        <button
          id="tab-sound-btn"
          className={`settings-nav-tab ${activeTab === 'sound' ? 'active' : ''}`}
          onClick={() => setActiveTab('sound')}
        >
          <Volume2 size={18} />
          <span>Sound & Haptics</span>
        </button>
        <button
          id="tab-data-btn"
          className={`settings-nav-tab ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <ShieldCheck size={18} />
          <span>Account & Reset</span>
        </button>
      </div>

      {/* TAB 1: USER PROFILE */}
      {activeTab === 'profile' && (
        <div className="settings-content-card">
          <div className="settings-section-title">
            <User size={22} className="accent-icon" />
            <div>
              <h3>Profile Information</h3>
              <p>Personalize your display name and counter avatar</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="settings-form">
            {/* Live Profile Card Preview */}
            <div className="profile-preview-card">
              <div className="avatar-preview-container">
                {photoURL ? (
                  <img src={photoURL} alt="Avatar preview" className="avatar-large-preview" />
                ) : (
                  <div className="avatar-placeholder-large">
                    {(displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-preview-info">
                <h4>{displayName || 'Anonymous User'}</h4>
                <p className="email-badge">{user.email}</p>
                <span className="role-tag">Active Member</span>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="settings-field">
              <label htmlFor="settings-username-input">User Display Name</label>
              <div className="input-group">
                <User size={18} className="input-icon" />
                <input
                  id="settings-username-input"
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <span className="field-hint">This name will be displayed at the top of your counter.</span>
            </div>

            {/* Avatar URL or Preset Selection */}
            <div className="settings-field">
              <label>Select Preset Avatar</label>
              <div className="avatar-presets-grid">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-avatar-btn ${photoURL === preset.url ? 'active' : ''}`}
                    onClick={() => {
                      setPhotoURL(preset.url);
                      setCustomAvatarInput(preset.url);
                    }}
                    title={preset.name}
                  >
                    <img src={preset.url} alt={preset.name} />
                    {photoURL === preset.url && (
                      <div className="preset-selected-check">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  className={`preset-avatar-btn initials-btn ${!photoURL ? 'active' : ''}`}
                  onClick={() => {
                    setPhotoURL('');
                    setCustomAvatarInput('');
                  }}
                  title="Use Name Initial"
                >
                  <div className="initials-avatar-content">
                    {(displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Photo URL Input */}
            <div className="settings-field">
              <label htmlFor="settings-photo-url-input">Or Custom Photo URL</label>
              <div className="input-group">
                <ImageIcon size={18} className="input-icon" />
                <input
                  id="settings-photo-url-input"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customAvatarInput}
                  onChange={(e) => {
                    setCustomAvatarInput(e.target.value);
                    setPhotoURL(e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="settings-action-bar">
              <button 
                id="save-profile-btn"
                type="submit" 
                className="btn-settings-primary" 
                disabled={saving}
              >
                {saving ? (
                  <div className="spinner-small" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: TARGET SETTINGS */}
      {activeTab === 'targets' && (
        <div className="settings-content-card">
          <div className="settings-section-title">
            <Target size={22} className="accent-icon" />
            <div>
              <h3>Daily Target Configuration</h3>
              <p>Configure default targets and rollover rules for your spiritual chanting</p>
            </div>
          </div>

          <div className="settings-form">
            {/* Janmangal Default Target */}
            <div className="target-config-block">
              <div className="target-block-header">
                <div className="target-icon-wrap janmangal-badge">J</div>
                <div>
                  <h4>Janmangal Daily Target</h4>
                  <p>Standard recitation count goal for Janmangal Stotra</p>
                </div>
              </div>

              <div className="target-input-row">
                <div className="target-number-input">
                  <input
                    id="janmangal-target-input"
                    type="number"
                    min="1"
                    max="10000"
                    value={targetJanmangal}
                    onChange={(e) => setTargetJanmangal(e.target.value)}
                  />
                  <span>per day</span>
                </div>

                <div className="quick-chip-container">
                  {[11, 21, 51, 108].map((val) => (
                    <button
                      key={`j-${val}`}
                      type="button"
                      className={`target-chip ${Number(targetJanmangal) === val ? 'active' : ''}`}
                      onClick={() => setTargetJanmangal(val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Malajaap Default Target */}
            <div className="target-config-block">
              <div className="target-block-header">
                <div className="target-icon-wrap malajaap-badge">M</div>
                <div>
                  <h4>Malajaap Daily Target</h4>
                  <p>Target number of rounds (Malas) to recite each day</p>
                </div>
              </div>

              <div className="target-input-row">
                <div className="target-number-input">
                  <input
                    id="malajaap-target-input"
                    type="number"
                    min="1"
                    max="1000"
                    value={targetMalajaap}
                    onChange={(e) => setTargetMalajaap(e.target.value)}
                  />
                  <span>Malas / day</span>
                </div>

                <div className="quick-chip-container">
                  {[1, 5, 11, 21, 51, 108].map((val) => (
                    <button
                      key={`m-${val}`}
                      type="button"
                      className={`target-chip ${Number(targetMalajaap) === val ? 'active' : ''}`}
                      onClick={() => setTargetMalajaap(val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Carryover and Immediate Update Options */}
            <div className="setting-toggle-item">
              <div className="toggle-info">
                <h4>Apply to Today's Active Counter</h4>
                <p>Instantly update the target count for today's counters in addition to future days.</p>
              </div>
              <label className="switch">
                <input
                  id="update-today-immediately-toggle"
                  type="checkbox"
                  checked={updateTodayImmediately}
                  onChange={(e) => setUpdateTodayImmediately(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-toggle-item">
              <div className="toggle-info">
                <h4>Auto-Carryover Leftover Target</h4>
                <p>If today's target is not completed, automatically add remaining count to the next day's target.</p>
              </div>
              <label className="switch">
                <input
                  id="carry-over-toggle"
                  type="checkbox"
                  checked={carryOverIncomplete}
                  onChange={(e) => setCarryOverIncomplete(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="settings-action-bar">
              <button 
                id="save-targets-btn"
                type="button" 
                className="btn-settings-primary" 
                onClick={handleSaveTargets}
                disabled={saving}
              >
                {saving ? (
                  <div className="spinner-small" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Target Preferences</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THEME & APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="settings-content-card">
          <div className="settings-section-title">
            <Palette size={22} className="accent-icon" />
            <div>
              <h3>Theme & Visual Styling</h3>
              <p>Personalize colors, backgrounds, and aesthetic feel</p>
            </div>
          </div>

          <div className="settings-form">
            {/* Theme selection */}
            <div className="settings-field">
              <label>App Base Theme</label>
              <div className="theme-options-grid">
                {/* Dark Theme */}
                <div 
                  className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('dark')}
                  id="theme-option-dark"
                >
                  <div className="theme-card-icon dark-icon">
                    <Moon size={24} />
                  </div>
                  <div className="theme-card-title">Obsidian Dark</div>
                  <div className="theme-card-desc">Sleek, deep black with glowing glass elements</div>
                  {theme === 'dark' && <div className="theme-check-badge"><Check size={16} /></div>}
                </div>

                {/* Light Theme */}
                <div 
                  className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('light')}
                  id="theme-option-light"
                >
                  <div className="theme-card-icon light-icon">
                    <Sun size={24} />
                  </div>
                  <div className="theme-card-title">Pure Frosted Light</div>
                  <div className="theme-card-desc">Clean, crisp daytime aesthetic with soft shadows</div>
                  {theme === 'light' && <div className="theme-check-badge"><Check size={16} /></div>}
                </div>

                {/* Saffron Theme */}
                <div 
                  className={`theme-card ${theme === 'saffron' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('saffron')}
                  id="theme-option-saffron"
                >
                  <div className="theme-card-icon saffron-icon">
                    <Flame size={24} />
                  </div>
                  <div className="theme-card-title">Divine Saffron</div>
                  <div className="theme-card-desc">Spiritual warm amber glow tailored for prayers</div>
                  {theme === 'saffron' && <div className="theme-check-badge"><Check size={16} /></div>}
                </div>
              </div>
            </div>

            {/* Accent Color selection */}
            <div className="settings-field">
              <label>Accent Glow & Button Color</label>
              <div className="accents-grid">
                {ACCENT_OPTIONS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className={`accent-color-card ${accent === acc.id ? 'active' : ''}`}
                    onClick={() => handleAccentChange(acc.id)}
                    id={`accent-option-${acc.id}`}
                    style={accent === acc.id ? { 
                      borderColor: acc.color, 
                      boxShadow: `0 0 0 2px ${acc.color}, 0 6px 20px ${acc.glow}` 
                    } : {}}
                  >
                    <div 
                      className="accent-swatch" 
                      style={{ background: acc.gradient }}
                    />
                    <span className="accent-name">{acc.name}</span>
                    {accent === acc.id && (
                      <div className="accent-check" style={{ color: acc.color }}>
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Interactive Preview */}
            <div className="theme-preview-box">
              <span className="preview-label">Live Button & Glow Preview</span>
              <div className="preview-elements">
                <button 
                  type="button" 
                  className="btn-main preview-count-btn" 
                  style={{
                    background: currentAccentData.gradient,
                    boxShadow: `0 10px 30px ${currentAccentData.glow}, inset 0 2px 0 rgba(255, 255, 255, 0.2)`
                  }}
                  onClick={() => {
                    handleTestSound();
                    if (hapticEnabled) triggerHaptic(25);
                  }}
                >
                  <span>Count</span>
                </button>
                <div className="stat-card preview-stat-card">
                  <div className="stat-label">Preview Target</div>
                  <div 
                    className="stat-value highlight"
                    style={{
                      background: currentAccentData.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: `0 4px 20px ${currentAccentData.glow}`
                    }}
                  >
                    108
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-action-bar">
              <button 
                id="save-theme-btn"
                type="button" 
                className="btn-settings-primary" 
                style={{
                  background: currentAccentData.gradient,
                  boxShadow: `0 4px 15px ${currentAccentData.glow}`
                }}
                onClick={handleSavePreferences}
                disabled={saving}
              >
                {saving ? (
                  <div className="spinner-small" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Theme Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SOUND & HAPTICS */}
      {activeTab === 'sound' && (
        <div className="settings-content-card">
          <div className="settings-section-title">
            <Volume2 size={22} className="accent-icon" />
            <div>
              <h3>Audio & Haptic Feedback</h3>
              <p>Sensory feedback on each bead click and goal celebration</p>
            </div>
          </div>

          <div className="settings-form">
            {/* Click Sound Toggle */}
            <div className="setting-toggle-item">
              <div className="toggle-info">
                <h4>Count Click Sound</h4>
                <p>Play a pleasant feedback tone whenever the count button is pressed.</p>
              </div>
              <label className="switch">
                <input
                  id="sound-enabled-toggle"
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Sound Type Selection */}
            {soundEnabled && (
              <div className="settings-field">
                <label>Select Sound Tone</label>
                <div className="sound-types-grid">
                  {[
                    { id: 'bead', name: 'Wooden Mala Bead', desc: 'Authentic warm wooden bead click' },
                    { id: 'bell', name: 'Temple Singing Bell', desc: 'Calming resonant prayer chime' },
                    { id: 'pop', name: 'Crisp Modern Pop', desc: 'Subtle digital tactile sound' }
                  ].map((s) => (
                    <div 
                      key={s.id}
                      className={`sound-card ${soundType === s.id ? 'active' : ''}`}
                      onClick={() => {
                        setSoundType(s.id);
                        handleTestSound(s.id);
                      }}
                      id={`sound-type-${s.id}`}
                    >
                      <div className="sound-card-header">
                        <span className="sound-card-title">{s.name}</span>
                        <button 
                          type="button" 
                          className="btn-test-sound" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestSound(s.id);
                          }}
                          title="Listen preview"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                      <span className="sound-card-desc">{s.desc}</span>
                      {soundType === s.id && <div className="sound-check-badge"><Check size={14} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Celebration Sound */}
            <div className="setting-toggle-item">
              <div className="toggle-info">
                <h4>Goal Celebration Chime</h4>
                <p>Play a joyful harmonic arpeggio when you successfully reach your daily target.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn-small"
                  onClick={() => soundFX.playTargetComplete()}
                  title="Test Target Reached Sound"
                >
                  <Sparkles size={16} />
                  <span>Preview</span>
                </button>
                <label className="switch">
                  <input
                    id="celebration-sound-toggle"
                    type="checkbox"
                    checked={celebrationSound}
                    onChange={(e) => setCelebrationSound(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>

            {/* Haptic Vibration */}
            <div className="setting-toggle-item">
              <div className="toggle-info">
                <h4>Vibration / Haptic Feedback</h4>
                <p>Subtle physical vibration on tap for supported mobile and touch devices.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn-small"
                  onClick={handleTestHaptic}
                >
                  <Smartphone size={16} />
                  <span>Test Haptic</span>
                </button>
                <label className="switch">
                  <input
                    id="haptic-enabled-toggle"
                    type="checkbox"
                    checked={hapticEnabled}
                    onChange={(e) => setHapticEnabled(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>

            <div className="settings-action-bar">
              <button 
                id="save-sound-btn"
                type="button" 
                className="btn-settings-primary" 
                onClick={handleSavePreferences}
                disabled={saving}
              >
                {saving ? (
                  <div className="spinner-small" />
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Audio & Haptics</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ACCOUNT & RESET */}
      {activeTab === 'data' && (
        <div className="settings-content-card">
          <div className="settings-section-title">
            <ShieldCheck size={22} className="accent-icon" />
            <div>
              <h3>Account & Data Controls</h3>
              <p>Manage your account info and counter reset utilities</p>
            </div>
          </div>

          <div className="settings-form">
            {/* Account Details */}
            <div className="account-info-box">
              <div className="info-row">
                <span className="info-label">Account Email</span>
                <span className="info-val">{user.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">User ID (UID)</span>
                <span className="info-val monospace">{user.uid}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email Verified</span>
                <span className="info-val">{user.emailVerified ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {/* Reset Today's Count */}
            <div className="danger-zone-card">
              <h4>Counter Reset Tools</h4>
              <p>If you made accidental clicks or wish to restart today's count from zero:</p>

              <div className="danger-actions-row">
                <button
                  id="reset-janmangal-btn"
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => setResetModalType('janmangal')}
                >
                  <RotateCcw size={16} />
                  <span>Reset Today's Janmangal</span>
                </button>

                <button
                  id="reset-malajaap-btn"
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => setResetModalType('malajaap')}
                >
                  <RotateCcw size={16} />
                  <span>Reset Today's Malajaap</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetModalType && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <AlertTriangle size={32} color="var(--danger-color)" />
              <h3>Confirm Reset</h3>
            </div>
            <p>
              Are you sure you want to reset today's{' '}
              <strong>{resetModalType === 'janmangal' ? 'Janmangal' : 'Malajaap'}</strong> count back to 0?
              This will only reset today's count; lifetime totals and past history remain safe.
            </p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-small" 
                onClick={() => setResetModalType(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-auth"
                style={{ background: 'var(--danger-color)', boxShadow: '0 4px 15px var(--danger-glow)' }}
                onClick={() => handleResetCount(resetModalType)}
              >
                Yes, Reset to 0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

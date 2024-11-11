import React, { useEffect, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { AuthService } from '../services/auth';
import { optionsManager } from '../options/optionsManager';
import './NewTab.css';
import MementoMori from './memento_mori/MementoMori';
import { DeviceSettings } from '../interfaces';
import { UserService } from '../services/userService';

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const NewTab: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [birthdate, setBirthdate] = useState<string | null>(null);

  const pendingChanges = useRef<DeviceSettings | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await optionsManager.getAll();
      setCurrentTask(settings.currentTask || '');
      setBirthdate(settings.mementoMori || null);
    };
    loadSettings();

    const unsubscribe = optionsManager.subscribe((event) => {
      if (event.key === 'currentTask') {
        setCurrentTask(event.newValue as string);
      } else if (event.key === 'mementoMori') {
        setBirthdate(event.newValue as string);
      }
    });

    return () => unsubscribe();
  }, []);

  const debouncedSave = React.useCallback(
    debounce(async (value: string) => {
      try {
        await optionsManager.set('currentTask', value);
        const currentSettings = await optionsManager.getAll();
        pendingChanges.current = currentSettings;
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }, 500),
    []
  );

  const handleTaskChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCurrentTask(newValue);
    setSaveStatus('saving');
    debouncedSave(newValue);
  };

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }
      await AuthService.signIn(email, password);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Sign in failed:', error);
      setError(error.code === 'auth/invalid-credential' 
        ? 'Invalid email or password' 
        : error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      await AuthService.signUp(email, password);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Sign up failed:', error);
      setError(error.code === 'auth/email-already-in-use' 
        ? 'Email already exists' 
        : error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pendingChanges.current && user) {
        UserService.syncSettings(user.uid, pendingChanges.current);
        pendingChanges.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      optionsManager.loadFromFirebase();
    }
  }, [user]);

  if (!authChecked) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-form">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <div className="auth-buttons">
            <button 
              onClick={handleSignIn} 
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Sign In'}
            </button>
            <button 
              onClick={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Sign Up'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="newtab-container">
      <p>Current task:</p>
      <div className="textbox-container">
        <textarea 
          className="main-textbox"
          value={currentTask}
          onChange={handleTaskChange}
          placeholder="What are you working on?"
        />
      </div>
      <div className="save-status">
        {saveStatus === 'saving' && <span>Saving...</span>}
        {saveStatus === 'saved' && <span>Saved</span>}
      </div>
      <div className="action-buttons">
        <button onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
        <button onClick={() => chrome.tabs.create({ url: '/logs/logs.html' })}>
          View Logs
        </button>
        <button onClick={() => AuthService.signOut()}>
          Sign Out
        </button>
      </div>
      {birthdate && <MementoMori birthDate={new Date(birthdate)} />}
    </div>
  );
};

export default NewTab; 
import React, { useEffect, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { AuthService } from '../services/auth';
import { optionsManager } from '../options/optionsManager';
import './NewTab.css';
import MementoMori from './memento_mori/MementoMori';
import { DeviceSettings } from '../interfaces';
import { UserService } from '../services/userService';
import { MessagingService } from '../services/messagingService';
import { StatusDisplay } from '../content/components/StatusDisplay';
import { PauseButton } from '../content/components/PauseButton';
import { IconButton, Menu, MenuItem } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { taskLogStore } from '../background/logStore';

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
  const [previousTasks, setPreviousTasks] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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
      if (event.key === 'mementoMori') {
        setBirthdate(event.newValue as string);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadPreviousTasks = async () => {
      const taskLogs = await taskLogStore.getLogs();
      const uniqueTasks = Array.from(new Set(taskLogs.map(log => log.task)))
        .filter(task => task !== currentTask && task !== '');
      setPreviousTasks(uniqueTasks);
    };
    loadPreviousTasks();
  }, [currentTask]);

  const handleSaveTask = async () => {
    setSaveStatus('saving');
    try {
      await optionsManager.set('currentTask', currentTask);
      await optionsManager.set('pauseState', false);
      const currentSettings = await optionsManager.getAll();
      pendingChanges.current = currentSettings;
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setError('Failed to save task');
    }
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
        console.log("Firebase syncing cancelled until mobile device features working");
        // UserService.syncSettings(user.uid, pendingChanges.current);
        // pendingChanges.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      // optionsManager.loadFromFirebase();
      // never load from firebase, only sync to firebase
    }
  }, [user]);

  const handleBlocklistToggle = async () => {
    if (!user) return; // Ensure user is authenticated
    try {
      await MessagingService.sendNotificationToUser(user.uid, {
        type: 'enableBlocklist',
        title: 'Blocklist Update',
        body: 'Attempting to toggle blocklist status',
        timestamp: Date.now(),
      });
      console.log('Notification sent successfully');
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTaskSelect = async (task: string) => {
    setCurrentTask(task);
    handleClose();
    
    console.log("SAVING TASK", task);
    setSaveStatus('saving');
    try {
      await optionsManager.set('currentTask', task);
      await optionsManager.set('pauseState', false);
      const currentSettings = await optionsManager.getAll();
      pendingChanges.current = currentSettings;
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setError('Failed to save task');
    }
  };

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
      <p>Objective:</p>
      <div className="textbox-container">
        <textarea 
          className="main-textbox"
          value={currentTask}
          onChange={(e) => setCurrentTask(e.target.value)}
          placeholder="What are you working on?"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveTask();
            }
          }}
        />
        <IconButton onClick={handleClick}>
          <KeyboardArrowDownIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {previousTasks.map((task, index) => (
            <MenuItem 
              key={index} 
              onClick={() => handleTaskSelect(task)}
            >
              {task}
            </MenuItem>
          ))}
        </Menu>
        <button onClick={handleSaveTask}>
          Start
        </button>
      </div>
      <div className="save-status">
        {saveStatus === 'saving' && <span>Saving...</span>}
        {saveStatus === 'saved' && <span>Saved</span>}
      </div>
      <StatusDisplay />
      <div className="action-buttons">
        <button onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
        <PauseButton />
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
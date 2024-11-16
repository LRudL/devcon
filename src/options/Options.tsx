import React, { useEffect, useState } from 'react';
import { optionsManager } from './optionsManager';
import type { DeviceSettings } from '../interfaces';
import styled from 'styled-components';

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProviderPanel = styled.div`
  border: 1px solid #ddd;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 5px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const SettingsContainer = styled.div`
  margin-left: 20px;
`;

const Status = styled.div<{ $isError?: boolean }>`
  margin-top: 10px;
  color: ${props => props.$isError ? 'red' : 'green'};
`;

const Select = styled.select`
  padding: 5px;
  margin-left: 10px;
`;

const SaveContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Options: React.FC = () => {
  const [settings, setSettings] = useState<DeviceSettings>({
    anthropicApiKey: '',
    deviceConstitution: '',
    currentTask: '',
    llmProvider: 'cloud',
    localModelName: '',
    enableXProcessor: true,
    aiJudgementPolicy: 'pageLoad',
    aiJudgementInterval: 240e3,
    mementoMori: false,
    debateBehaviour: 'oneRound',
    disableOnPageLoad: false,
    pauseState: false
  });
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
    populateModelDropdown();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await optionsManager.getAll();
    setSettings(savedSettings);
  };

  const populateModelDropdown = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) throw new Error('Ollama not found');
      
      const data = await response.json();
      const modelList = data.models.map((m: any) => m.name);
      setModels(modelList);
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      setModels([]);
    }
  };

  const handleSave = async () => {
    try {
      await optionsManager.update(settings);
      setStatus({ message: 'Settings saved!', isError: false });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setStatus({ message: 'Error saving settings', isError: true });
    }
  };

  const handleMementoMori = async () => {
    if (settings.mementoMori) {
      setSettings(prev => ({ ...prev, mementoMori: false }));
      return;
    }

    const birthdate = prompt('Enter your birthdate (yyyy-mm-dd):');
    if (!birthdate) return;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthdate)) {
      alert('Invalid date format. Please use yyyy-mm-dd');
      return;
    }

    const date = new Date(birthdate);
    if (isNaN(date.getTime())) {
      alert('Invalid date');
      return;
    }

    setSettings(prev => ({ ...prev, mementoMori: birthdate }));
  };

  const handleTaskChange = async (newTask: string) => {
    await optionsManager.set('currentTask', newTask);
    setSettings(prev => ({ ...prev, currentTask: newTask }));
  };

  return (
    <Container>
      <Header>
        <h1>Settings</h1>
        <div>
          <button onClick={() => chrome.runtime.reload()}>Reload Extension</button>
          <button onClick={() => window.history.back()}>Back</button>
        </div>
      </Header>
      <SaveContainer>
        <button onClick={handleSave}>Save</button>
        {status && (
          <Status $isError={status.isError}>{status.message}</Status>
        )}
      </SaveContainer>

      <FormGroup>
        <label htmlFor="constitution">Browser Constitution (general principles related to how you use your device):</label>
        <textarea
          id="constitution"
          value={settings.deviceConstitution}
          onChange={e => setSettings(prev => ({ ...prev, deviceConstitution: e.target.value }))}
          style={{ width: '100%', minHeight: '200px' }}
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="currentTask">Current Task (can also be set on the new tab screen - what you're currently working on):</label>
        <textarea
          id="currentTask"
          value={settings.currentTask}
          onChange={e => handleTaskChange(e.target.value)}
          style={{ width: '100%', minHeight: '100px' }}
        />
      </FormGroup>



      {/* <ProviderPanel>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            id="enableXProcessor"
            checked={settings.enableXProcessor}
            onChange={e => setSettings(prev => ({ ...prev, enableXProcessor: e.target.checked }))}
          />
          <label htmlFor="enableXProcessor">Enable X/Twitter content processing</label>
        </div>
      </ProviderPanel> 
      <ProviderPanel>
        <div>
          <label htmlFor="aiJudgementPolicy">AI Judgment Policy:</label>
          <Select
            id="aiJudgementPolicy"
            value={settings.aiJudgementPolicy}
            onChange={e => setSettings(prev => ({ 
              ...prev, 
              aiJudgementPolicy: e.target.value as DeviceSettings['aiJudgementPolicy']
            }))}
          >
            <option value="pageLoad">On Page Load</option>
            <option value="interval">Periodic Check</option>
            <option value="manual">Manual Only</option>
          </Select>
        </div>

        {settings.aiJudgementPolicy === 'interval' && (
          <SettingsContainer>
            <label htmlFor="aiJudgementInterval">Check Interval (minutes):</label>
            <input
              id="aiJudgementInterval"
              type="number"
              min="1"
              value={settings.aiJudgementInterval / 60e3}
              onChange={e => setSettings(prev => ({ 
                ...prev, 
                aiJudgementInterval: Math.max(60e3, parseInt(e.target.value) * 60e3) 
              }))}
              style={{ marginLeft: '10px', width: '80px' }}
            />
          </SettingsContainer>
        )}
      </ProviderPanel> */}

      <ProviderPanel>
        <div>
          <label htmlFor="debateBehaviour">Debate Behaviour:</label>
          <Select
            id="debateBehaviour"
            value={settings.debateBehaviour}
            onChange={e => setSettings(prev => ({ 
              ...prev, 
              debateBehaviour: e.target.value as DeviceSettings['debateBehaviour']
            }))}
          >
            <option value="oneRound">One round, instant tab close on lose</option>
            <option value="multiRound">Multi-round, user closes tab</option>
          </Select>
        </div>
      </ProviderPanel>

      <FormGroup>
        <ProviderPanel>
          <div>
            <input
              type="radio"
              id="cloudLLM"
              name="llmProvider"
              checked={settings.llmProvider === 'cloud'}
              onChange={() => setSettings(prev => ({ ...prev, llmProvider: 'cloud' }))}
            />
            <label htmlFor="cloudLLM">Cloud (Anthropic)</label>
          </div>
          {/*<SettingsContainer>
            <label htmlFor="apiKey">Anthropic API Key:</label>
            <input
              id="apiKey"
              size={50}
              value={settings.anthropicApiKey}
              onChange={e => setSettings(prev => ({ ...prev, anthropicApiKey: e.target.value }))}
            />
          </SettingsContainer>*/}
        </ProviderPanel>

        <ProviderPanel>
          <div>
            <input
              type="radio"
              id="localLLM"
              name="llmProvider"
              checked={settings.llmProvider === 'local'}
              onChange={() => setSettings(prev => ({ ...prev, llmProvider: 'local' }))}
            />
            <label htmlFor="localLLM">Local (Ollama - probably broken, and requires Ollama install)</label>
          </div>
          <SettingsContainer>
            <label htmlFor="modelName">Ollama Model:</label>
            <select
              id="modelName"
              value={settings.localModelName}
              onChange={e => setSettings(prev => ({ ...prev, localModelName: e.target.value }))}
            >
              {models.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))
              )}
            </select>
          </SettingsContainer>
        </ProviderPanel>
      </FormGroup>

      <ProviderPanel>
        <button onClick={handleMementoMori}>
          {settings.mementoMori ? `memento mori enabled on new tab page (${settings.mementoMori}) - click to disable` : 'memento mori'}
        </button>
      </ProviderPanel>

      <ProviderPanel>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            id="disableOnPageLoad"
            checked={settings.disableOnPageLoad}
            onChange={e => setSettings(prev => ({ ...prev, disableOnPageLoad: e.target.checked }))}
          />
          <label htmlFor="disableOnPageLoad">Disable extension on page load</label>
        </div>
      </ProviderPanel>

   </Container>
  );
};

export default Options; 
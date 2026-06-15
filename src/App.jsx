import { useState } from 'react'
import WorkoutView from './views/WorkoutView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'

const TABS = [
  { id: 'workout', label: 'Workout' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('workout')

  return (
    <div className="app">
      <main className="app-content">
        {activeTab === 'workout' && <WorkoutView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>
      <nav className="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

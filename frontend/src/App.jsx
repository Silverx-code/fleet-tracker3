import { useState } from 'react'
import MapViewGoogle from './components/MapViewGoogle'
import AdminPanel from './components/AdminPanel'
import Dashboard from './components/Dashboard'
import Analytics from './components/Analytics'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('map')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const views = {
    map: { icon: '🗺️', label: 'Live Map', component: MapViewGoogle },
    dashboard: { icon: '📊', label: 'Dashboard', component: Dashboard },
    analytics: { icon: '📈', label: 'Analytics', component: Analytics },
    admin: { icon: '⚙️', label: 'Admin Panel', component: AdminPanel },
  }

  const CurrentComponent = views[currentView].component

  return (
    <div className="app">
      {/* Top Header */}
      <header className="header">
        <div className="header-left">
          <button 
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1>🚛 Fleet Tracker</h1>
        </div>
        
        <div className="header-right">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search vehicles..." 
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="user-menu">
            <button className="notification-btn">
              🔔
              <span className="notification-badge">3</span>
            </button>
            <button className="user-avatar">
              👤
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar Navigation */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            {Object.entries(views).map(([key, view]) => (
              <button
                key={key}
                className={`nav-item ${currentView === key ? 'active' : ''}`}
                onClick={() => setCurrentView(key)}
              >
                <span className="nav-icon">{view.icon}</span>
                {sidebarOpen && <span className="nav-label">{view.label}</span>}
              </button>
            ))}
          </nav>
          
          {sidebarOpen && (
            <div className="sidebar-footer">
              <div className="system-status">
                <div className="status-item">
                  <span className="status-dot online"></span>
                  <span>System Online</span>
                </div>
                <div className="status-item">
                  <span className="status-dot"></span>
                  <span>Vehicles Active</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <CurrentComponent />
        </main>
      </div>
    </div>
  )
}

export default App
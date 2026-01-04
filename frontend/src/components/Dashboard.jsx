import { useState, useEffect } from 'react'
import axios from 'axios'
import './Dashboard.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    moving: 0,
    idle: 0,
    totalDistance: 0,
    avgSpeed: 0
  })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vehicles/with-last-position`)
      const data = response.data
      
      setVehicles(data)
      
      // Calculate stats
      const active = data.filter(v => v.last_position).length
      const moving = data.filter(v => v.last_position && v.last_position.speed > 5).length
      const idle = active - moving
      const avgSpeed = data
        .filter(v => v.last_position)
        .reduce((sum, v) => sum + v.last_position.speed, 0) / (active || 1)
      
      setStats({
        total: data.length,
        active,
        moving,
        idle,
        avgSpeed: avgSpeed.toFixed(1)
      })
      
      // Recent activity (mock for now)
      const activity = data
        .filter(v => v.last_position)
        .slice(0, 5)
        .map(v => ({
          vehicle: v.name,
          action: v.last_position.speed > 5 ? 'Moving' : 'Stopped',
          location: `${v.last_position.lat.toFixed(4)}, ${v.last_position.lng.toFixed(4)}`,
          time: new Date(v.last_position.recorded_at).toLocaleTimeString()
        }))
      
      setRecentActivity(activity)
      
    } catch (err) {
      console.error('Error loading dashboard:', err)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
        <button className="refresh-btn" onClick={loadDashboardData}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">🚛</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Vehicles</p>
          </div>
        </div>

        <div className="stat-card active">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.active}</h3>
            <p>Active Now</p>
          </div>
        </div>

        <div className="stat-card moving">
          <div className="stat-icon">🚗💨</div>
          <div className="stat-content">
            <h3>{stats.moving}</h3>
            <p>Moving</p>
          </div>
        </div>

        <div className="stat-card idle">
          <div className="stat-icon">⏸️</div>
          <div className="stat-content">
            <h3>{stats.idle}</h3>
            <p>Idle</p>
          </div>
        </div>

        <div className="stat-card speed">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>{stats.avgSpeed} km/h</h3>
            <p>Avg Speed</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Vehicle Status List */}
        <div className="card vehicle-status-card">
          <h3>Vehicle Status</h3>
          <div className="vehicle-status-list">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className="vehicle-status-item">
                <div className="vehicle-status-icon">
                  {vehicle.last_position ? (
                    vehicle.last_position.speed > 5 ? '🚗' : '🅿️'
                  ) : '❌'}
                </div>
                <div className="vehicle-status-info">
                  <h4>{vehicle.name}</h4>
                  <p>{vehicle.plate_no || 'No plate'}</p>
                </div>
                <div className="vehicle-status-badge">
                  {vehicle.last_position ? (
                    <span className={`badge ${vehicle.last_position.speed > 5 ? 'moving' : 'idle'}`}>
                      {vehicle.last_position.speed > 5 ? 'Moving' : 'Idle'}
                    </span>
                  ) : (
                    <span className="badge offline">Offline</span>
                  )}
                </div>
                {vehicle.last_position && (
                  <div className="vehicle-status-speed">
                    {vehicle.last_position.speed.toFixed(0)} km/h
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card activity-card">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-time">{activity.time}</div>
                <div className="activity-content">
                  <strong>{activity.vehicle}</strong>
                  <span className="activity-action">{activity.action}</span>
                  <span className="activity-location">{activity.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import axios from 'axios'
import './Analytics.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function Analytics() {
  const [vehicles, setVehicles] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [timeRange, setTimeRange] = useState('today')
  
  useEffect(() => {
    loadVehicles()
  }, [])
  
  const loadVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vehicles`)
      setVehicles(response.data)
      if (response.data.length > 0) {
        setSelectedVehicle(response.data[0].id)
      }
    } catch (err) {
      console.error('Error loading vehicles:', err)
    }
  }
  
  return (
    <div className="analytics">
      <div className="analytics-header">
        <h2>Analytics & Reports</h2>
        
        <div className="analytics-controls">
          <select 
            value={selectedVehicle || ''} 
            onChange={(e) => setSelectedVehicle(Number(e.target.value))}
            className="vehicle-select"
          >
            <option value="">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          
          <div className="time-range-buttons">
            {['today', 'week', 'month'].map(range => (
              <button
                key={range}
                className={`time-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>📊 Distance Traveled</h3>
          <div className="metric-value">245.8 km</div>
          <div className="metric-change positive">+12% from last period</div>
        </div>
        
        <div className="analytics-card">
          <h3>⏱️ Drive Time</h3>
          <div className="metric-value">8h 32m</div>
          <div className="metric-change neutral">~Same as last period</div>
        </div>
        
        <div className="analytics-card">
          <h3>⛽ Fuel Efficiency</h3>
          <div className="metric-value">12.5 L/100km</div>
          <div className="metric-change positive">-5% (improved)</div>
        </div>
        
        <div className="analytics-card">
          <h3>🎯 Trips Completed</h3>
          <div className="metric-value">24</div>
          <div className="metric-change positive">+8 from last period</div>
        </div>
      </div>
      
      <div className="charts-section">
        <div className="chart-card">
          <h3>Speed Over Time</h3>
          <div className="chart-placeholder">
            📈 Chart visualization would go here
            <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginTop: '1rem' }}>
              Integrate with Chart.js or Recharts for real visualizations
            </p>
          </div>
        </div>
        
        <div className="chart-card">
          <h3>Distance by Day</h3>
          <div className="chart-placeholder">
            📊 Bar chart would go here
          </div>
        </div>
      </div>
    </div>
  )
}
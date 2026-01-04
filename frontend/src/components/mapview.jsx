import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { useEffect, useState } from 'react'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function MapView() {
  const [vehicles, setVehicles] = useState([])
  const [positions, setPositions] = useState({})
  const [trails, setTrails] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)

  // Load vehicles on mount
  useEffect(() => {
    loadVehicles()
    // Refresh vehicles list every 30 seconds (in case new vehicles added)
    const interval = setInterval(loadVehicles, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load positions when vehicles change
  useEffect(() => {
    if (vehicles.length > 0) {
      loadAllPositions()
    }
  }, [vehicles])

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (vehicles.length === 0) return

    const wsUrl = API_BASE.replace('http', 'ws').replace('/api', '/api/ws')
    console.log('Connecting to WebSocket:', wsUrl)
    
    let ws
    
    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setWsConnected(true)
        
        // Subscribe to all vehicles
        vehicles.forEach(v => {
          ws.send(JSON.stringify({ type: 'subscribe', vehicle_id: v.id }))
          console.log(`Subscribed to vehicle ${v.id}`)
        })

        // Send periodic ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)

        // Store interval ID for cleanup
        ws.pingInterval = pingInterval
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        console.log('WebSocket message:', message)
        
        if (message.type === 'position_update') {
          const { vehicle_id, data } = message
          
          // Update latest position
          setPositions(prev => ({
            ...prev,
            [vehicle_id]: data
          }))

          // Update trail
          setTrails(prev => {
            const currentTrail = prev[vehicle_id] || []
            const newTrail = [[data.lat, data.lng], ...currentTrail].slice(0, 50)
            return {
              ...prev,
              [vehicle_id]: newTrail
            }
          })

          console.log(`Updated position for vehicle ${vehicle_id}:`, data)
        }
        
        if (message.type === 'subscribed') {
          console.log(`✅ Subscribed to vehicle ${message.vehicle_id}`)
        }

        if (message.type === 'pong') {
          console.log('Pong received')
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        setWsConnected(false)
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setWsConnected(false)
        
        // Clear ping interval
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval)
        }
      }

    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setWsConnected(false)
    }

    // Cleanup on unmount
    return () => {
      if (ws) {
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval)
        }
        ws.close()
      }
    }
  }, [vehicles])

  const loadVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vehicles`)
      setVehicles(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading vehicles:', error)
      setLoading(false)
    }
  }

  const loadAllPositions = async () => {
    try {
      const posData = {}
      const trailData = {}

      for (const vehicle of vehicles) {
        // Get latest position
        try {
          const latestRes = await axios.get(`${API_BASE}/positions/${vehicle.id}/latest`)
          posData[vehicle.id] = latestRes.data
        } catch (err) {
          console.log(`No position for vehicle ${vehicle.id}`)
        }

        // Get trail (last 50 positions)
        try {
          const trailRes = await axios.get(`${API_BASE}/positions/${vehicle.id}?limit=50`)
          trailData[vehicle.id] = trailRes.data.map(p => [p.lat, p.lng])
        } catch (err) {
          console.log(`No trail for vehicle ${vehicle.id}`)
        }
      }

      setPositions(posData)
      setTrails(trailData)
    } catch (error) {
      console.error('Error loading positions:', error)
    }
  }

  if (loading) {
    return <div className="loading">Loading map...</div>
  }

  // Default center (Lagos, Nigeria - you can change this)
  const defaultCenter = [6.5244, 3.3792]
  const mapCenter = selectedVehicle && positions[selectedVehicle]
    ? [positions[selectedVehicle].lat, positions[selectedVehicle].lng]
    : defaultCenter

  return (
    <div className="map-container">
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        id="map"
        key={selectedVehicle}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Draw trails */}
        {Object.entries(trails).map(([vehicleId, trail]) => {
          if (trail.length > 1) {
            return (
              <Polyline
                key={`trail-${vehicleId}`}
                positions={trail}
                color="#3498db"
                weight={3}
                opacity={0.6}
              />
            )
          }
          return null
        })}

        {/* Draw vehicle markers */}
        {vehicles.map(vehicle => {
          const pos = positions[vehicle.id]
          if (!pos) return null

          return (
            <Marker 
              key={vehicle.id} 
              position={[pos.lat, pos.lng]}
              eventHandlers={{
                click: () => setSelectedVehicle(vehicle.id)
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>{vehicle.name}</h3>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Plate:</strong> {vehicle.plate_no || 'N/A'}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Speed:</strong> {pos.speed} km/h
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#666' }}>
                    <strong>Last Update:</strong><br/>
                    {new Date(pos.recorded_at).toLocaleString()}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#666' }}>
                    <strong>Location:</strong><br/>
                    {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Vehicle List Sidebar */}
      <div className="vehicle-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Vehicles ({vehicles.length})</h3>
          <div 
            style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: wsConnected ? '#2ecc71' : '#e74c3c',
              boxShadow: wsConnected ? '0 0 8px #2ecc71' : 'none'
            }}
            title={wsConnected ? 'Real-time connected' : 'Real-time disconnected'}
          />
        </div>
        
        <ul className="vehicle-list">
          {vehicles.map(vehicle => {
            const pos = positions[vehicle.id]
            return (
              <li
                key={vehicle.id}
                className={`vehicle-item ${selectedVehicle === vehicle.id ? 'active' : ''}`}
                onClick={() => setSelectedVehicle(vehicle.id)}
              >
                <strong>{vehicle.name}</strong>
                <br />
                <small>{vehicle.plate_no || 'No plate'}</small>
                {pos && (
                  <>
                    <br />
                    <small>Speed: {pos.speed} km/h</small>
                  </>
                )}
              </li>
            )
          })}
          {vehicles.length === 0 && (
            <li style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
              No vehicles yet. Go to Admin Panel to add vehicles.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
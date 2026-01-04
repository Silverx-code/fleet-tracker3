import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api'
import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import './MapViewGoogle.css'

const API_BASE = 'http://localhost:8000/api'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDw4oyXjQDYxyoC5qo_d7zInX6dT8ceHGA'

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = { lat: 6.5244, lng: 3.3792 }

export default function MapViewGoogle() {
  const [vehicles, setVehicles] = useState([])
  const [positions, setPositions] = useState({})
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [center, setCenter] = useState(defaultCenter)
  const [zoom, setZoom] = useState(13)
  
  const mapRef = useRef(null)

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    id: 'google-map-script'
  })

  // Load vehicles
  useEffect(() => {
    loadVehicles()
    const interval = setInterval(loadVehicles, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vehicles/with-last-position`)
      const data = response.data
      
      const vehiclesList = []
      const positionsMap = {}
      
      data.forEach(item => {
        vehiclesList.push({
          id: item.id,
          name: item.name,
          plate_no: item.plate_no
        })
        
        if (item.last_position) {
          positionsMap[item.id] = item.last_position
        }
      })
      
      setVehicles(vehiclesList)
      setPositions(positionsMap)
    } catch (error) {
      console.error('Error loading vehicles:', error)
    }
  }

  const handleVehicleSelect = (vehicleId) => {
    setSelectedVehicle(vehicleId)
    const pos = positions[vehicleId]
    if (pos && mapRef.current) {
      setCenter({ lat: pos.lat, lng: pos.lng })
      setZoom(15)
      mapRef.current.panTo({ lat: pos.lat, lng: pos.lng })
    }
  }

  const onLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  if (loadError) {
    return (
      <div className="error-message">
        <h2>❌ Error Loading Google Maps</h2>
        <p>{loadError.message}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="loading">
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '1rem' }}>Loading Google Maps...</p>
      </div>
    )
  }

  return (
    <div className="map-view-google">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true
        }}
      >
        {/* Vehicle Markers */}
        {vehicles.map(vehicle => {
          const pos = positions[vehicle.id]
          if (!pos) return null

          return (
            <Marker
              key={vehicle.id}
              position={{ lat: pos.lat, lng: pos.lng }}
              onClick={() => handleVehicleSelect(vehicle.id)}
              title={vehicle.name}
            />
          )
        })}
      </GoogleMap>

      {/* Vehicle Sidebar */}
      <div className="vehicle-info-google">
        <div className="sidebar-header">
          <h3>Vehicles ({vehicles.length})</h3>
          <span>🟢</span>
        </div>
        
        <ul className="vehicle-list-google">
          {vehicles.map(vehicle => {
            const pos = positions[vehicle.id]
            return (
              <li
                key={vehicle.id}
                className={`vehicle-item-google ${selectedVehicle === vehicle.id ? 'active' : ''}`}
                onClick={() => handleVehicleSelect(vehicle.id)}
              >
                <div className="vehicle-icon">
                  {pos ? (pos.speed > 5 ? '🚗' : '🅿️') : '❌'}
                </div>
                <div className="vehicle-details">
                  <strong>{vehicle.name}</strong>
                  <small>{vehicle.plate_no || 'No plate'}</small>
                  {pos && (
                    <span className="vehicle-speed">{pos.speed.toFixed(0)} km/h</span>
                  )}
                </div>
              </li>
            )
          })}
          {vehicles.length === 0 && (
            <li className="no-vehicles">
              No vehicles yet. Add one in Admin Panel.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import axios from 'axios'
import './AdminPanel.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'

export default function AdminPanel() {
  const [vehicles, setVehicles] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', plate_no: '' })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vehicles`)
      setVehicles(response.data)
    } catch (err) {
      setError('Failed to load vehicles')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingId) {
        // Update existing vehicle (you'll need to add PUT endpoint)
        await axios.put(`${API_BASE}/vehicles/${editingId}`, formData)
        setSuccess('Vehicle updated successfully!')
      } else {
        // Create new vehicle
        await axios.post(`${API_BASE}/vehicles`, formData)
        setSuccess('Vehicle created successfully!')
      }
      
      setFormData({ name: '', plate_no: '' })
      setEditingId(null)
      setShowAddForm(false)
      loadVehicles()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save vehicle')
    }
  }

  const handleEdit = (vehicle) => {
    setFormData({ name: vehicle.name, plate_no: vehicle.plate_no || '' })
    setEditingId(vehicle.id)
    setShowAddForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      await axios.delete(`${API_BASE}/vehicles/${id}`)
      setSuccess('Vehicle deleted successfully!')
      loadVehicles()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to delete vehicle')
    }
  }

  const handleCancel = () => {
    setFormData({ name: '', plate_no: '' })
    setEditingId(null)
    setShowAddForm(false)
    setError('')
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Fleet Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(true)}
        >
          + Add Vehicle
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showAddForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Vehicle Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Truck 1"
                />
              </div>
              <div className="form-group">
                <label>Plate Number</label>
                <input
                  type="text"
                  value={formData.plate_no}
                  onChange={(e) => setFormData({ ...formData, plate_no: e.target.value })}
                  placeholder="e.g., ABC-123"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="vehicles-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Plate Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                  No vehicles yet. Click "Add Vehicle" to create one.
                </td>
              </tr>
            ) : (
              vehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  <td>{vehicle.id}</td>
                  <td>{vehicle.name}</td>
                  <td>{vehicle.plate_no || '—'}</td>
                  <td>
                    <button 
                      className="btn-icon btn-edit"
                      onClick={() => handleEdit(vehicle)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon btn-delete"
                      onClick={() => handleDelete(vehicle.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
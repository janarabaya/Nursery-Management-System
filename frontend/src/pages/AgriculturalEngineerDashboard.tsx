import { useState, useEffect } from 'react';
import { useRequireRole } from '../utils/useAuth';
import './AgriculturalEngineerDashboard.css';

interface Plant {
  id: number;
  name: string;
  latin_name?: string;
  category?: string;
  image_url?: string;
  quantity?: number;
  health_status?: 'healthy' | 'needs_attention' | 'critical' | 'unknown';
}

interface PlantHealthLog {
  id: number;
  plant_id: number;
  logged_at: string;
  irrigation_liters?: number;
  fertilization_notes?: string;
  spraying_notes?: string;
  disease_detected?: string;
  diagnosis?: string;
  recommendation?: string;
  plant?: Plant;
}

interface InspectionRecord {
  id: number;
  plant_id: number;
  inspection_date: string;
  growth_stage: string;
  height_cm?: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string;
  plant?: Plant;
}

interface InventoryItem {
  id: number;
  quantity: number;
  reorder_level: number;
  plant?: Plant;
}

interface CustomerAdviceRequest {
  id: number;
  customer_name: string;
  email: string;
  plant_name: string;
  question: string;
  created_at: string;
  status: 'pending' | 'answered';
  answer?: string;
}

type TabType = 'health-monitoring' | 'care-recommendations' | 'inspection-records' | 'inventory' | 'customer-advice' | 'profile';

export function AgriculturalEngineerDashboard() {
  const { user, isLoading, hasAccess } = useRequireRole('agricultural_engineer');
  const [activeTab, setActiveTab] = useState<TabType>('health-monitoring');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [healthLogs, setHealthLogs] = useState<PlantHealthLog[]>([]);
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [adviceRequests, setAdviceRequests] = useState<CustomerAdviceRequest[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CustomerAdviceRequest | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Health log form
  const [healthLogForm, setHealthLogForm] = useState({
    plant_id: '',
    irrigation_liters: '',
    fertilization_notes: '',
    spraying_notes: '',
    disease_detected: '',
    diagnosis: '',
    recommendation: '',
  });

  // Inspection form
  const [inspectionForm, setInspectionForm] = useState({
    plant_id: '',
    growth_stage: '',
    height_cm: '',
    condition: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    notes: '',
  });

  // Advice answer form
  const [adviceAnswer, setAdviceAnswer] = useState('');

  // Profile state
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    certifications: '',
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchProfile();
      fetchPlants();
      fetchHealthLogs();
      fetchInspectionRecords();
      fetchInventory();
      fetchAdviceRequests();
    }
  }, [isLoading, hasAccess]);

  const fetchProfile = async () => {
    try {
      const mockUser = localStorage.getItem('mockUser');
      if (mockUser) {
        const userData = JSON.parse(mockUser);
        setProfile({
          full_name: userData.full_name || 'Agricultural Engineer',
          email: userData.email || '',
          phone: userData.phone || '',
          specialization: userData.specialization || 'Plant Health & Care',
          certifications: userData.certifications || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPlants = async () => {
    setIsLoadingData(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlants(data);
      } else {
        // Mock data
        const mockPlants: Plant[] = [
          {
            id: 1,
            name: 'Tomato Seedling',
            latin_name: 'Solanum lycopersicum',
            category: 'Vegetables',
            image_url: 'https://via.placeholder.com/100',
            quantity: 50,
            health_status: 'healthy',
          },
          {
            id: 2,
            name: 'Rose Plant',
            latin_name: 'Rosa',
            category: 'Flowers',
            image_url: 'https://via.placeholder.com/100',
            quantity: 30,
            health_status: 'needs_attention',
          },
          {
            id: 3,
            name: 'Basil Plant',
            latin_name: 'Ocimum basilicum',
            category: 'Herbs',
            image_url: 'https://via.placeholder.com/100',
            quantity: 10,
            health_status: 'critical',
          },
        ];
        setPlants(mockPlants);
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchHealthLogs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plant-health`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHealthLogs(data);
      } else {
        // Mock data
        const mockLogs: PlantHealthLog[] = [
          {
            id: 1,
            plant_id: 1,
            logged_at: '2024-01-15T10:00:00Z',
            irrigation_liters: 5,
            fertilization_notes: 'Applied NPK fertilizer',
            disease_detected: 'None',
            diagnosis: 'Plant is healthy',
            recommendation: 'Continue regular watering schedule',
            plant: plants.find(p => p.id === 1),
          },
        ];
        setHealthLogs(mockLogs);
      }
    } catch (error) {
      console.error('Error fetching health logs:', error);
    }
  };

  const fetchInspectionRecords = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inspections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInspectionRecords(data);
      } else {
        // Mock data
        const mockRecords: InspectionRecord[] = [
          {
            id: 1,
            plant_id: 1,
            inspection_date: '2024-01-15T10:00:00Z',
            growth_stage: 'Vegetative',
            height_cm: 25,
            condition: 'excellent',
            notes: 'Plant is growing well, no issues detected',
            plant: plants.find(p => p.id === 1),
          },
        ];
        setInspectionRecords(mockRecords);
      }
    } catch (error) {
      console.error('Error fetching inspection records:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      } else {
        // Mock data
        const mockInventory: InventoryItem[] = [
          {
            id: 1,
            quantity: 50,
            reorder_level: 20,
            plant: plants.find(p => p.id === 1),
          },
        ];
        setInventory(mockInventory);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchAdviceRequests = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/advice-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdviceRequests(data);
      } else {
        // Mock data
        const mockRequests: CustomerAdviceRequest[] = [
          {
            id: 1,
            customer_name: 'Ahmed Ali',
            email: 'ahmed@example.com',
            plant_name: 'Tomato Seedling',
            question: 'How often should I water my tomato plants?',
            created_at: '2024-01-15T09:00:00Z',
            status: 'pending',
          },
          {
            id: 2,
            customer_name: 'Sara Mohammed',
            email: 'sara@example.com',
            plant_name: 'Rose Plant',
            question: 'My roses have yellow leaves. What should I do?',
            created_at: '2024-01-14T16:00:00Z',
            status: 'answered',
            answer: 'Yellow leaves can indicate overwatering or nutrient deficiency...',
          },
        ];
        setAdviceRequests(mockRequests);
      }
    } catch (error) {
      console.error('Error fetching advice requests:', error);
    }
  };

  const updatePlantHealthStatus = async (plantId: number, status: string) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}/health-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ health_status: status }),
      });

      if (response.ok) {
        setSuccess('Plant health status updated successfully!');
        fetchPlants();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to update plant health status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update plant health status');
    }
  };

  const submitHealthLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!healthLogForm.plant_id) {
      setError('Please select a plant');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plant-health`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plant_id: parseInt(healthLogForm.plant_id),
          irrigation_liters: healthLogForm.irrigation_liters ? parseFloat(healthLogForm.irrigation_liters) : null,
          fertilization_notes: healthLogForm.fertilization_notes || null,
          spraying_notes: healthLogForm.spraying_notes || null,
          disease_detected: healthLogForm.disease_detected || null,
          diagnosis: healthLogForm.diagnosis || null,
          recommendation: healthLogForm.recommendation || null,
        }),
      });

      if (response.ok) {
        setSuccess('Health log created successfully!');
        setHealthLogForm({
          plant_id: '',
          irrigation_liters: '',
          fertilization_notes: '',
          spraying_notes: '',
          disease_detected: '',
          diagnosis: '',
          recommendation: '',
        });
        fetchHealthLogs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to create health log');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create health log');
    }
  };

  const submitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!inspectionForm.plant_id) {
      setError('Please select a plant');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inspections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plant_id: parseInt(inspectionForm.plant_id),
          growth_stage: inspectionForm.growth_stage,
          height_cm: inspectionForm.height_cm ? parseFloat(inspectionForm.height_cm) : null,
          condition: inspectionForm.condition,
          notes: inspectionForm.notes,
        }),
      });

      if (response.ok) {
        setSuccess('Inspection record created successfully!');
        setInspectionForm({
          plant_id: '',
          growth_stage: '',
          height_cm: '',
          condition: 'good',
          notes: '',
        });
        fetchInspectionRecords();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to create inspection record');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create inspection record');
    }
  };

  const submitAdviceAnswer = async (requestId: number) => {
    if (!adviceAnswer.trim()) {
      setError('Please enter an answer');
      return;
    }

    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/advice-requests/${requestId}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: adviceAnswer }),
      });

      if (response.ok) {
        setSuccess('Advice answer submitted successfully!');
        setAdviceAnswer('');
        setSelectedRequest(null);
        fetchAdviceRequests();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to submit answer');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    }
  };

  const updateProfile = async () => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/engineers/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <div className="engineer-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return '#10b981';
      case 'needs_attention':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getHealthStatusLabel = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'needs_attention':
        return 'Needs Attention';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="engineer-dashboard">
      <div className="engineer-dashboard-content">
        <header className="engineer-dashboard-header">
          <div className="header-left">
            <h1>Agricultural Engineer Dashboard</h1>
            <p className="welcome-text">Welcome, {profile.full_name || 'Engineer'}! Monitor and manage plant health</p>
          </div>
        </header>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <div className="engineer-tabs">
          <button
            className={`tab-btn ${activeTab === 'health-monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('health-monitoring')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Health Monitoring
          </button>
          <button
            className={`tab-btn ${activeTab === 'care-recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('care-recommendations')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            Care & Treatment
          </button>
          <button
            className={`tab-btn ${activeTab === 'inspection-records' ? 'active' : ''}`}
            onClick={() => setActiveTab('inspection-records')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Inspection Records
          </button>
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"></path>
            </svg>
            Inventory (Health View)
          </button>
          <button
            className={`tab-btn ${activeTab === 'customer-advice' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer-advice')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Customer Advice
          </button>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </button>
        </div>

        <div className="engineer-panel">
          {/* Health Monitoring Tab */}
          {activeTab === 'health-monitoring' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h2>Plant Health Monitoring</h2>
              </div>
              {isLoadingData ? (
                <div className="loading-state">Loading plants...</div>
              ) : (
                <div className="plants-grid">
                  {plants.map(plant => (
                    <div key={plant.id} className="plant-card">
                      {plant.image_url && (
                        <img src={plant.image_url} alt={plant.name} className="plant-image" />
                      )}
                      <div className="plant-info">
                        <h3>{plant.name}</h3>
                        {plant.latin_name && <p className="latin-name">{plant.latin_name}</p>}
                        {plant.category && <p className="category">{plant.category}</p>}
                        <div className="health-status-badge" style={{ backgroundColor: getHealthStatusColor(plant.health_status) + '20', color: getHealthStatusColor(plant.health_status) }}>
                          {getHealthStatusLabel(plant.health_status)}
                        </div>
                      </div>
                      <div className="plant-actions">
                        <select
                          value={plant.health_status || 'unknown'}
                          onChange={(e) => updatePlantHealthStatus(plant.id, e.target.value)}
                          className="status-select"
                        >
                          <option value="healthy">Healthy</option>
                          <option value="needs_attention">Needs Attention</option>
                          <option value="critical">Critical</option>
                          <option value="unknown">Unknown</option>
                        </select>
                        <button className="view-btn" onClick={() => setSelectedPlant(plant)}>
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Care & Treatment Tab */}
          {activeTab === 'care-recommendations' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                  </svg>
                </div>
                <h2>Care & Treatment Recommendations</h2>
              </div>
              <div className="two-column-layout">
                <div className="form-section">
                  <h3>Create Health Log</h3>
                  <form className="health-log-form" onSubmit={submitHealthLog}>
                    <div className="form-group">
                      <label htmlFor="plant_id">Plant *</label>
                      <select
                        id="plant_id"
                        value={healthLogForm.plant_id}
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, plant_id: e.target.value })}
                        required
                      >
                        <option value="">Select a plant</option>
                        {plants.map(plant => (
                          <option key={plant.id} value={plant.id}>{plant.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="irrigation_liters">Irrigation (Liters)</label>
                      <input
                        type="number"
                        id="irrigation_liters"
                        step="0.1"
                        value={healthLogForm.irrigation_liters}
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, irrigation_liters: e.target.value })}
                        placeholder="e.g., 5.0"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="fertilization_notes">Fertilization Notes</label>
                      <textarea
                        id="fertilization_notes"
                        value={healthLogForm.fertilization_notes}
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, fertilization_notes: e.target.value })}
                        placeholder="Describe fertilization applied..."
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="spraying_notes">Spraying Notes</label>
                      <textarea
                        id="spraying_notes"
                        value={healthLogForm.spraying_notes}
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, spraying_notes: e.target.value })}
                        placeholder="Describe any spraying treatments..."
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="disease_detected">Disease Detected</label>
                      <input
                        type="text"
                        id="disease_detected"
                        value={healthLogForm.disease_detected}
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, disease_detected: e.target.value })}
                        placeholder="e.g., None, Powdery Mildew, etc."
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="diagnosis">Diagnosis</label>
                      <textarea
                        id="diagnosis"
                        value={healthLogForm.diagnosis}
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, diagnosis: e.target.value })}
                        placeholder="Enter diagnosis details..."
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="recommendation">Recommendation</label>
                      <textarea
                        id="recommendation"
                        value={healthLogForm.recommendation}
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, recommendation: e.target.value })}
                        placeholder="Enter care recommendations..."
                        rows={3}
                      />
                    </div>
                    <button type="submit" className="save-btn">Create Health Log</button>
                  </form>
                </div>
                <div className="logs-section">
                  <h3>Recent Health Logs</h3>
                  <div className="logs-list">
                    {healthLogs.length === 0 ? (
                      <div className="empty-state">No health logs yet</div>
                    ) : (
                      healthLogs.map(log => (
                        <div key={log.id} className="log-card">
                          <div className="log-header">
                            <h4>{log.plant?.name || `Plant #${log.plant_id}`}</h4>
                            <span className="log-date">{new Date(log.logged_at).toLocaleDateString()}</span>
                          </div>
                          {log.irrigation_liters && <p><strong>Irrigation:</strong> {log.irrigation_liters}L</p>}
                          {log.disease_detected && <p><strong>Disease:</strong> {log.disease_detected}</p>}
                          {log.diagnosis && <p><strong>Diagnosis:</strong> {log.diagnosis}</p>}
                          {log.recommendation && <p><strong>Recommendation:</strong> {log.recommendation}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inspection Records Tab */}
          {activeTab === 'inspection-records' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <h2>Plant Growth & Inspection Records</h2>
              </div>
              <div className="two-column-layout">
                <div className="form-section">
                  <h3>New Inspection Record</h3>
                  <form className="inspection-form" onSubmit={submitInspection}>
                    <div className="form-group">
                      <label htmlFor="inspection_plant_id">Plant *</label>
                      <select
                        id="inspection_plant_id"
                        value={inspectionForm.plant_id}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, plant_id: e.target.value })}
                        required
                      >
                        <option value="">Select a plant</option>
                        {plants.map(plant => (
                          <option key={plant.id} value={plant.id}>{plant.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="growth_stage">Growth Stage</label>
                      <input
                        type="text"
                        id="growth_stage"
                        value={inspectionForm.growth_stage}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, growth_stage: e.target.value })}
                        placeholder="e.g., Seedling, Vegetative, Flowering"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="height_cm">Height (cm)</label>
                      <input
                        type="number"
                        id="height_cm"
                        step="0.1"
                        value={inspectionForm.height_cm}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, height_cm: e.target.value })}
                        placeholder="e.g., 25.5"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="condition">Condition *</label>
                      <select
                        id="condition"
                        value={inspectionForm.condition}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, condition: e.target.value as any })}
                        required
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="inspection_notes">Notes</label>
                      <textarea
                        id="inspection_notes"
                        value={inspectionForm.notes}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                        placeholder="Enter inspection notes..."
                        rows={4}
                      />
                    </div>
                    <button type="submit" className="save-btn">Create Inspection Record</button>
                  </form>
                </div>
                <div className="records-section">
                  <h3>Recent Inspection Records</h3>
                  <div className="records-list">
                    {inspectionRecords.length === 0 ? (
                      <div className="empty-state">No inspection records yet</div>
                    ) : (
                      inspectionRecords.map(record => (
                        <div key={record.id} className="record-card">
                          <div className="record-header">
                            <h4>{record.plant?.name || `Plant #${record.plant_id}`}</h4>
                            <span className="record-date">{new Date(record.inspection_date).toLocaleDateString()}</span>
                          </div>
                          <div className="record-details">
                            <p><strong>Growth Stage:</strong> {record.growth_stage}</p>
                            {record.height_cm && <p><strong>Height:</strong> {record.height_cm} cm</p>}
                            <p><strong>Condition:</strong> <span className="condition-badge" data-condition={record.condition}>{record.condition}</span></p>
                            {record.notes && <p><strong>Notes:</strong> {record.notes}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z"></path>
                  </svg>
                </div>
                <h2>Inventory - Plant Health Perspective</h2>
              </div>
              <div className="inventory-table-container">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Plant Name</th>
                      <th>Health Status</th>
                      <th>Quantity</th>
                      <th>Reorder Level</th>
                      <th>Health Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => {
                      const plant = plants.find(p => p.id === item.plant?.id);
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="plant-cell">
                              {item.plant?.image_url && (
                                <img src={item.plant.image_url} alt={item.plant.name} className="plant-thumb" />
                              )}
                              <span>{item.plant?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="health-status-badge"
                              style={{
                                backgroundColor: getHealthStatusColor(plant?.health_status) + '20',
                                color: getHealthStatusColor(plant?.health_status),
                              }}
                            >
                              {getHealthStatusLabel(plant?.health_status)}
                            </span>
                          </td>
                          <td>{item.quantity}</td>
                          <td>{item.reorder_level}</td>
                          <td>
                            {plant?.health_status === 'critical' && (
                              <span className="alert-badge critical">⚠️ Critical Health</span>
                            )}
                            {plant?.health_status === 'needs_attention' && (
                              <span className="alert-badge attention">⚠️ Needs Attention</span>
                            )}
                            {(!plant?.health_status || plant.health_status === 'healthy') && (
                              <span className="alert-badge ok">✓ Healthy</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customer Advice Tab */}
          {activeTab === 'customer-advice' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h2>Customer Agricultural Advice Requests</h2>
              </div>
              <div className="advice-requests-list">
                {adviceRequests.length === 0 ? (
                  <div className="empty-state">No advice requests</div>
                ) : (
                  adviceRequests.map(request => (
                    <div
                      key={request.id}
                      className={`advice-card ${request.status === 'pending' ? 'pending' : 'answered'}`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="advice-header">
                        <div>
                          <h3>{request.plant_name}</h3>
                          <p className="customer-info">{request.customer_name} ({request.email})</p>
                        </div>
                        <div className="advice-meta">
                          <span className="advice-date">{new Date(request.created_at).toLocaleDateString()}</span>
                          <span className={`status-badge ${request.status}`}>{request.status}</span>
                        </div>
                      </div>
                      <p className="advice-question">{request.question}</p>
                      {request.answer && (
                        <div className="advice-answer">
                          <strong>Answer:</strong> {request.answer}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="dashboard-section">
              <div className="section-header">
                <div className="section-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h2>Personal Profile</h2>
              </div>
              <form className="profile-form" onSubmit={(e) => { e.preventDefault(); updateProfile(); }}>
                <div className="form-group">
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="specialization">Specialization</label>
                  <input
                    type="text"
                    id="specialization"
                    value={profile.specialization}
                    onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                    placeholder="e.g., Plant Health & Care, Crop Management"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="certifications">Certifications</label>
                  <textarea
                    id="certifications"
                    value={profile.certifications}
                    onChange={(e) => setProfile({ ...profile, certifications: e.target.value })}
                    placeholder="List your certifications and qualifications..."
                    rows={4}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Profile</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Plant Details Modal */}
      {selectedPlant && (
        <div className="modal-overlay" onClick={() => setSelectedPlant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPlant.name}</h2>
              <button className="modal-close" onClick={() => setSelectedPlant(null)}>×</button>
            </div>
            <div className="modal-body">
              {selectedPlant.latin_name && <p><strong>Latin Name:</strong> {selectedPlant.latin_name}</p>}
              {selectedPlant.category && <p><strong>Category:</strong> {selectedPlant.category}</p>}
              <p><strong>Health Status:</strong> {getHealthStatusLabel(selectedPlant.health_status)}</p>
              {selectedPlant.quantity !== undefined && <p><strong>Quantity:</strong> {selectedPlant.quantity}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Advice Request Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Answer Customer Question</h2>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="question-details">
                <p><strong>Plant:</strong> {selectedRequest.plant_name}</p>
                <p><strong>Customer:</strong> {selectedRequest.customer_name} ({selectedRequest.email})</p>
                <p><strong>Question:</strong></p>
                <div className="question-text">{selectedRequest.question}</div>
              </div>
              {selectedRequest.status === 'pending' && (
                <div className="answer-section">
                  <label htmlFor="adviceAnswer">Your Answer:</label>
                  <textarea
                    id="adviceAnswer"
                    value={adviceAnswer}
                    onChange={(e) => setAdviceAnswer(e.target.value)}
                    placeholder="Provide detailed agricultural advice..."
                    rows={6}
                  />
                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setSelectedRequest(null)}>Cancel</button>
                    <button className="send-btn" onClick={() => submitAdviceAnswer(selectedRequest.id)}>Submit Answer</button>
                  </div>
                </div>
              )}
              {selectedRequest.answer && (
                <div className="existing-answer">
                  <strong>Your Answer:</strong>
                  <div className="answer-text">{selectedRequest.answer}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireRole } from '../utils/useAuth';
import { API_BASE_URL } from '../config/api';
import './SimplePlantManagement.css';

interface Plant {
  id: number;
  name: string;
  type: 'tree' | 'flower' | 'herb'; // شجر، زهور، نباتات عشبية
  price: number;
  available: boolean; // متوفر أو غير متوفر
  description: string;
  imageUrl?: string;
}

export function SimplePlantManagement() {
  const { user, isLoading, hasAccess } = useRequireRole(['manager', 'agricultural_engineer']);
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'flower' as 'tree' | 'flower' | 'herb',
    price: '',
    available: true,
    description: '',
    imageUrl: ''
  });

  // Fetch plants from Access database
  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    setLoading(true);
    setError('');
    
    // Mock data - only used as fallback if API fails
    const mockPlants: Plant[] = [
      { id: 1, name: 'Rose', type: 'flower', price: 10, available: true, description: 'Red rose seedling', imageUrl: 'https://cdn.pixabay.com/photo/2021/08/08/01/32/flower-6529708_640.jpg' },
      { id: 2, name: 'Olive Tree', type: 'tree', price: 25, available: true, description: 'Young olive tree', imageUrl: 'https://cdn.pixabay.com/photo/2022/09/29/09/35/olive-7486982_1280.jpg' },
      { id: 3, name: 'Basil', type: 'herb', price: 5, available: true, description: 'Fresh basil plant', imageUrl: 'https://th.bing.com/th/id/OIP.1b0XZfoPTkdkDXcJnP10vwHaHa?w=182&h=182&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1' },
      { id: 4, name: 'Lemon Tree', type: 'tree', price: 30, available: false, description: 'Seasonal', imageUrl: 'https://tse1.mm.bing.net/th/id/OIP.tk_lsnJraAULhyM_xN8FRAHaE8?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' },
      { id: 5, name: 'Mint', type: 'herb', price: 6, available: true, description: 'Mint for cooking', imageUrl: 'https://th.bing.com/th/id/OIP.kGXM3ovnKfaOfc2p8qCZPQHaE7?w=264&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1' },
    ];
    
    // Build the API URL - ensure proper formatting
    // Use /api/test for proxy (works in both dev and prod)
    const proxyApiUrl = '/api/test';
    
    // Also prepare direct URL for fallback (for development)
    const directApiUrl = 'http://localhost:5000/api/test';
    
    console.log('🌱 ===== FETCH PLANTS START =====');
    console.log('📡 API_BASE_URL:', API_BASE_URL);
    console.log('🔗 Direct API URL:', directApiUrl);
    console.log('🔗 Proxy API URL:', proxyApiUrl);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🌐 Window location:', window.location.href);
    console.log('🌐 Window hostname:', window.location.hostname);
    
    let response: Response | null = null;
    let apiUrl = directApiUrl;
    let fetchError: Error | null = null;
    
    try {
      // Try proxy URL first (recommended approach)
      console.log('📤 Attempting HTTP GET request to proxy URL:', proxyApiUrl);
      
      const fetchStartTime = performance.now();
      try {
        response = await fetch(proxyApiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          cache: 'no-cache',
        });
        const fetchEndTime = performance.now();
        apiUrl = proxyApiUrl;
        console.log('✅ Proxy URL request completed');
        console.log('   Response time:', (fetchEndTime - fetchStartTime).toFixed(2), 'ms');
      } catch (proxyError: any) {
        console.warn('⚠️ Proxy URL request failed:', proxyError.message);
        fetchError = proxyError;
        
        // If proxy URL fails and we're in development, try direct URL as fallback
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('📤 Attempting HTTP GET request to direct URL (fallback):', directApiUrl);
          try {
            const directFetchStartTime = performance.now();
            response = await fetch(directApiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              cache: 'no-cache',
              mode: 'cors',
            });
            const directFetchEndTime = performance.now();
            apiUrl = directApiUrl;
            console.log('✅ Direct URL request completed (fallback)');
            console.log('   Response time:', (directFetchEndTime - directFetchStartTime).toFixed(2), 'ms');
          } catch (directError: any) {
            console.error('❌ Direct URL request also failed:', directError.message);
            throw new Error(`Both proxy and direct requests failed. Proxy: ${proxyError.message}, Direct: ${directError.message}`);
          }
        } else {
          throw proxyError;
        }
      }
      
      if (!response) {
        throw new Error('No response received from either direct or proxy URL');
      }
      
      console.log('📥 HTTP Response received');
      console.log('   Final URL used:', apiUrl);
      console.log('   Status:', response.status, response.statusText);
      console.log('   Headers:', Object.fromEntries(response.headers.entries()));
      console.log('   Response OK:', response.ok);
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('   Error response body:', errorText);
        } catch (textError) {
          console.error('   Could not read error response body:', textError);
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ''}`);
      }
      
      console.log('📦 Parsing JSON response...');
      const result = await response.json();
      console.log('✅ JSON parsed successfully');
      console.log('   Response structure:', {
        hasSuccess: 'success' in result,
        hasData: 'data' in result,
        hasCount: 'count' in result,
        dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
        dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
      });
      
      if (!result.success) {
        throw new Error(`API returned success: false. Error: ${result.error || 'Unknown error'}`);
      }
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error(`Invalid API response format. Expected data array, got: ${typeof result.data}. Response: ${JSON.stringify(result).substring(0, 200)}`);
      }
      
      const plantCount = result.count || result.data.length;
      console.log(`✅ API Response: Successfully fetched ${plantCount} plants from database`);
      
      // Transform database plants to Plant format
      console.log('🔄 Transforming plant data...');
      const transformedPlants: Plant[] = result.data.map((item: any, index: number) => {
        // Try multiple possible image field names (including Picture from Access DB)
        const imageUrl = item.Picture || item.ImageURL || item.imageUrl || item.Image || item.image || 
                       item.Photo || item.photo || item.Attachment || item.attachment || 
                       item.ImagePath || item.imagePath || '';
        
        // Handle attachment field - if it's a number, it might be a count, otherwise treat as URL
        let finalImageUrl = '';
        if (imageUrl) {
          if (typeof imageUrl === 'string' && imageUrl.trim() !== '' && 
              imageUrl !== 'null' && imageUrl !== 'undefined' && 
              !imageUrl.match(/^\(\d+\)$/)) { // Exclude attachment counts like "(1)"
            const trimmedUrl = String(imageUrl).trim();
            // If it's just a filename (no http/https), build the full URL from backend
            if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
              finalImageUrl = `http://localhost:5000/images/${trimmedUrl}`;
            } else {
              finalImageUrl = trimmedUrl;
            }
          }
        }
        
        const plant: Plant = {
          id: item.PlantID || item.ID || item.id || item.Plant_ID || (index + 1),
          name: item.PlantName || item.Name || item.name || item.Plant_Name || 'Unknown',
          type: mapTypeToEnum(item.Type || item.type || item.Category || item.category || 'flower'),
          price: parseFloat(item.Price || item.price || item.Cost || item.cost || 0),
          available: item.Available !== false && item.available !== false && 
                   item.Status !== 'Unavailable' && item.status !== 'unavailable' &&
                   item.Status !== 'Out of Stock' && item.status !== 'out of stock',
          description: item.Description || item.description || item.Desc || item.desc || '',
          imageUrl: finalImageUrl
        };
        
        return plant;
      });
      
      console.log(`✅ Successfully transformed ${transformedPlants.length} plants`);
      console.log('📊 Plants summary:', transformedPlants.map((p: Plant) => ({ 
        id: p.id, 
        name: p.name, 
        available: p.available,
        price: p.price 
      })));
      
      // Only set plants from database after successful transformation
      setPlants(transformedPlants);
      setError(''); // Clear any previous errors
      console.log('🎉 ===== FETCH PLANTS SUCCESS =====');
      
    } catch (err: any) {
      // Log error clearly in console
      console.error('❌ ===== FETCH PLANTS ERROR =====');
      console.error('   Error Type:', err.constructor.name);
      console.error('   Error Name:', err.name);
      console.error('   Error Message:', err.message);
      console.error('   Error Stack:', err.stack);
      console.error('   API URL attempted:', apiUrl);
      console.error('   API_BASE_URL value:', API_BASE_URL);
      console.error('   Is fetch available:', typeof fetch !== 'undefined');
      console.error('   Network error details:', {
        message: err.message,
        cause: (err as any).cause,
        code: (err as any).code,
      });
      console.warn('⚠️ Falling back to mock data (5 plants)');
      console.error('❌ ===== END ERROR =====');
      
      // Only use mock data as fallback if API fails
      setError(`Failed to load plants from database: ${err.message}. Using mock data as fallback.`);
      setPlants(mockPlants);
    } finally {
      setLoading(false);
      console.log('🏁 ===== FETCH PLANTS COMPLETE =====');
    }
  };

  // Helper function to map database type values to our enum
  const mapTypeToEnum = (type: string): 'tree' | 'flower' | 'herb' => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('tree') || lowerType.includes('شجر')) return 'tree';
    if (lowerType.includes('herb') || lowerType.includes('عشب') || lowerType.includes('عشبية')) return 'herb';
    return 'flower'; // default
  };

  // Helper function to get default image based on plant name
  const getDefaultImage = (plantName: string, type: 'tree' | 'flower' | 'herb'): string => {
    const name = plantName.toLowerCase();
    
    // Specific plant images
    if (name.includes('rose')) return 'https://cdn.pixabay.com/photo/2021/08/08/01/32/flower-6529708_640.jpg';
    if (name.includes('olive')) return 'https://cdn.pixabay.com/photo/2022/09/29/09/35/olive-7486982_1280.jpg';
    if (name.includes('basil')) return 'https://th.bing.com/th/id/OIP.1b0XZfoPTkdkDXcJnP10vwHaHa?w=182&h=182&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1';
    if (name.includes('lemon')) return 'https://tse1.mm.bing.net/th/id/OIP.tk_lsnJraAULhyM_xN8FRAHaE8?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3';
    if (name.includes('mint')) return 'https://th.bing.com/th/id/OIP.kGXM3ovnKfaOfc2p8qCZPQHaE7?w=264&h=180&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1';
    
    // Type-based default images
    if (type === 'tree') return 'https://cdn.pixabay.com/photo/2015/12/01/20/28/tree-1073367_640.jpg';
    if (type === 'herb') return 'https://th.bing.com/th/id/OIP.1b0XZfoPTkdkDXcJnP10vwHaHa?w=182&h=182&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1';
    return 'https://cdn.pixabay.com/photo/2021/08/08/01/32/flower-6529708_640.jpg'; // default flower
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? value : value
    }));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setError('Please enter a plant ID or name');
      return;
    }

    const query = searchQuery.trim().toLowerCase();
    const found = plants.find(p => 
      p.id.toString() === query || 
      p.name.toLowerCase().includes(query)
    );

    if (found) {
      setSelectedPlant(found);
      setFormData({
        id: found.id.toString(),
        name: found.name,
        type: found.type,
        price: found.price.toString(),
        available: found.available,
        description: found.description,
        imageUrl: found.imageUrl || ''
      });
      setShowAddForm(true);
      setError('');
    } else {
      setError('Plant not found');
      setSelectedPlant(null);
    }
  };

  const handleAddPlant = async () => {
    if (!formData.name || !formData.price || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const plantId = formData.id ? parseInt(formData.id) : null;
    const isUpdate = !!plantId;

    try {
      const url = isUpdate 
        ? `${API_BASE_URL}/plants/${plantId}`
        : `${API_BASE_URL}/plants`;
      
      const method = isUpdate ? 'PUT' : 'POST';
      
      console.log(`[Frontend] ${method} ${url} - Saving plant`);
      console.log(`[Frontend] Plant data:`, {
        name: formData.name,
        price: formData.price,
        type: formData.type,
        available: formData.available,
        description: formData.description,
        imageUrl: formData.imageUrl
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          type: formData.type,
          category: formData.type,
          available: formData.available,
          description: formData.description,
          imageUrl: formData.imageUrl || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[Frontend] Save response:`, result);

      if (result.success && result.data) {
        // Update frontend state with the returned plant data
        const updatedPlant: Plant = {
          id: result.data.id || plantId || Date.now(),
          name: result.data.name || formData.name,
          type: (result.data.type || result.data.category || formData.type) as 'tree' | 'flower' | 'herb',
          price: result.data.price || parseFloat(formData.price),
          available: result.data.available !== undefined ? result.data.available : formData.available,
          description: result.data.description || formData.description,
          imageUrl: result.data.imageUrl || formData.imageUrl || undefined
        };

        // Update plants state with the returned data
        if (isUpdate) {
          setPlants(prev => prev.map(p => p.id === updatedPlant.id ? updatedPlant : p));
        } else {
          setPlants(prev => [...prev, updatedPlant]);
        }

        setSuccess(isUpdate ? 'Plant updated successfully!' : 'Plant added successfully!');
        resetForm();
        
        // Refresh plants list to ensure sync with database
        await fetchPlants();
      } else {
        throw new Error(result.error || result.message || 'Failed to save plant');
      }
    } catch (err: any) {
      console.error('[Frontend] Error saving plant:', err);
      setError(err.message || 'Failed to save plant. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
    }
  };

  const handleDeletePlant = async (id: number) => {
    if (window.confirm('Are you sure you want to stop selling this plant?')) {
      try {
        // Try to delete from Access database
        const tablesResponse = await fetch(`${API_BASE_URL}/db/info`);
        const tablesData = await tablesResponse.json();
        
        if (tablesData.success && tablesData.tables.length > 0) {
          const plantTableNames = ['Plants', 'Plant', 'Products', 'Product', 'نباتات', 'منتجات'];
          let plantTable = null;
          
          for (const tableName of plantTableNames) {
            if (tablesData.tables.includes(tableName)) {
              plantTable = tableName;
              break;
            }
          }
          
          if (!plantTable && tablesData.tables.length > 0) {
            plantTable = tablesData.tables[0];
          }

          if (plantTable) {
            await fetch(`${API_BASE_URL}/db/table/${plantTable}/delete`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                where: { ID: id }
              })
            });
            setSuccess('Plant removed successfully from database');
            await fetchPlants();
          }
        }
      } catch (err: any) {
        console.error('Error deleting from database:', err);
        // Fallback to local state update
        setPlants(prev => prev.filter(p => p.id !== id));
        setSuccess('Plant removed successfully (local only)');
      }
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Reusable function to save plant updates to database
  const savePlantToDatabase = async (plantId: number, updateData: any): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log(`[Frontend] Saving plant ${plantId} with data:`, updateData);
      
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[Frontend] Save response:`, result);

      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        throw new Error(result.error || result.message || 'Failed to save plant');
      }
    } catch (err: any) {
      console.error(`[Frontend] Error saving plant ${plantId}:`, err);
      return { success: false, error: err.message || 'Failed to save plant' };
    }
  };

  const handleToggleAvailability = async (id: number) => {
    const plant = plants.find(p => p.id === id);
    if (!plant) return;

    const newAvailability = !plant.available;
    
    setSaving(true);
    setError('');
    
    try {
      const result = await savePlantToDatabase(id, {
        available: newAvailability
      });

      if (result.success && result.data) {
        // Update frontend state with returned data
        const updatedPlant: Plant = {
          id: result.data.id || id,
          name: result.data.name || plant.name,
          type: (result.data.type || result.data.category || plant.type) as 'tree' | 'flower' | 'herb',
          price: result.data.price || plant.price,
          available: result.data.available !== undefined ? result.data.available : newAvailability,
          description: result.data.description || plant.description,
          imageUrl: result.data.imageUrl || plant.imageUrl || undefined
        };

        setPlants(prev => prev.map(p => p.id === id ? updatedPlant : p));
        setSuccess('Availability updated successfully!');
        
        // Refresh to ensure sync
        await fetchPlants();
      } else {
        throw new Error(result.error || 'Failed to update availability');
      }
    } catch (err: any) {
      console.error('Error updating availability:', err);
      setError(err.message || 'Failed to update availability. Please try again.');
      // Fallback to local state update
      setPlants(prev => prev.map(p => 
        p.id === id ? { ...p, available: newAvailability } : p
      ));
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      type: 'flower',
      price: '',
      available: true,
      description: '',
      imageUrl: ''
    });
    setSelectedPlant(null);
    setShowAddForm(false);
    setSearchQuery('');
    setError('');
  };

  const filteredPlants = plants.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.id.toString().includes(query) || p.name.toLowerCase().includes(query);
  });

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!hasAccess) {
    return <div className="access-denied">Access Denied</div>;
  }

  return (
    <div className="simple-plant-management">
      <div className="management-header">
        <button className="back-btn" onClick={() => navigate('/manager-dashboard')}>
          ← Back
        </button>
        <h1>Plant Management</h1>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="management-content">
        {/* Search Section */}
        <div className="search-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by Plant ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>Search</button>
          </div>
          <button className="add-btn" onClick={() => { resetForm(); setShowAddForm(true); }}>
            + Add New Plant
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="form-section">
            <h2>{formData.id ? 'Edit Plant' : 'Add New Plant'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleAddPlant(); }}>
              {formData.id && (
                <div className="form-group">
                  <label>Plant ID:</label>
                  <input type="text" value={formData.id} disabled />
                </div>
              )}
              
              <div className="form-group">
                <label>Plant Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="tree">شجر (Tree)</option>
                  <option value="flower">زهور (Flower)</option>
                  <option value="herb">نباتات عشبية (Herb)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="available"
                    checked={formData.available}
                    onChange={handleInputChange}
                  />
                  Available (متوفر)
                </label>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label>Image URL (optional)</label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? 'Saving...' : (formData.id ? 'Update Plant' : 'Add Plant')}
                </button>
                <button type="button" onClick={resetForm} className="cancel-btn" disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Plants List */}
        <div className="plants-list">
          <h2>All Plants ({filteredPlants.length})</h2>
          {loading ? (
            <div className="loading">Loading plants...</div>
          ) : filteredPlants.length === 0 ? (
            <div className="empty-state">No plants found</div>
          ) : (
            <div className="plants-grid">
              {filteredPlants.map(plant => (
                <div key={plant.id} className={`plant-card ${!plant.available ? 'unavailable' : ''}`}>
                  <div className="plant-image">
                    {(() => {
                      const hasImage = plant.imageUrl && plant.imageUrl.trim() !== '' && 
                                     plant.imageUrl !== 'null' && plant.imageUrl !== 'undefined' &&
                                     !plant.imageUrl.match(/^\(\d+\)$/);
                      const imageSrc = hasImage ? plant.imageUrl : getDefaultImage(plant.name, plant.type);
                      
                      return (
                        <img 
                          src={imageSrc} 
                          alt={plant.name}
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent) {
                              target.style.display = 'none';
                              if (!parent.querySelector('.image-placeholder')) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'image-placeholder';
                                placeholder.textContent = plant.name.charAt(0).toUpperCase();
                                parent.appendChild(placeholder);
                              }
                            }
                          }}
                          onLoad={(e) => {
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent) {
                              const placeholder = parent.querySelector('.image-placeholder');
                              if (placeholder) {
                                placeholder.remove();
                              }
                            }
                          }}
                        />
                      );
                    })()}
                  </div>
                  <div className="plant-info">
                    <div className="plant-header">
                      <h3>{plant.name}</h3>
                      <span className="plant-id">ID: {plant.id}</span>
                    </div>
                    <div className="plant-details">
                      <p><strong>Type:</strong> <span>{
                        plant.type === 'tree' ? 'شجر (Tree)' :
                        plant.type === 'flower' ? 'زهور (Flower)' :
                        'نباتات عشبية (Herb)'
                      }</span></p>
                      <p><strong>Price:</strong> <span>₪{plant.price}</span></p>
                      <p><strong>Status:</strong> 
                        <span className={plant.available ? 'status-available' : 'status-unavailable'}>
                          {plant.available ? ' متوفر (Available)' : ' غير متوفر (Unavailable)'}
                        </span>
                      </p>
                      <p className="description-text"><strong>Description:</strong> <span>{plant.description}</span></p>
                    </div>
                    <div className="plant-actions">
                      <button 
                        onClick={() => {
                          setFormData({
                            id: plant.id.toString(),
                            name: plant.name,
                            type: plant.type,
                            price: plant.price.toString(),
                            available: plant.available,
                            description: plant.description,
                            imageUrl: plant.imageUrl || ''
                          });
                          setSelectedPlant(plant);
                          setShowAddForm(true);
                        }}
                        className="edit-btn"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleAvailability(plant.id)}
                        className={`toggle-btn ${plant.available ? 'make-unavailable' : 'make-available'}`}
                      >
                        {plant.available ? 'Make Unavailable' : 'Make Available'}
                      </button>
                      <button 
                        onClick={() => handleDeletePlant(plant.id)}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireRole } from '../utils/useAuth';
import { API_BASE_URL } from '../config/api';
import './ManagePlants.css';

interface Plant {
  id: number;
  name: string;
  variety?: string;
  season?: string;
  growthDuration?: number; // in days
  price: string;
  description: string;
  imageUrl: string;
  category: string | string[];
  isPopular?: boolean;
  quantity?: number;
  isActive?: boolean;
  growthStage?: 'seed' | 'seedling' | 'ready_for_sale';
  plantingDate?: string;
  expectedHarvestDate?: string;
  wateringSchedule?: {
    frequency: number; // days
    lastWatered?: string;
    nextWatering?: string;
  };
  fertilizationSchedule?: {
    frequency: number; // days
    lastFertilized?: string;
    nextFertilization?: string;
  };
  healthStatus?: 'healthy' | 'diseased' | 'pest_infested' | 'damaged';
  healthIssues?: Array<{
    type: 'disease' | 'pest' | 'damage';
    description: string;
    date: string;
    status: 'active' | 'treated' | 'isolated' | 'destroyed';
  }>;
  inventoryStatus?: 'growing' | 'ready_for_inventory' | 'in_inventory';
  cost?: number;
  revenue?: number;
  // New fields
  plantType?: 'ornamental' | 'vegetable' | 'fruit'; // زينة / خضار / فواكه
  locationType?: 'indoor' | 'outdoor'; // داخلية / خارجية
  lifecycleType?: 'seasonal' | 'perennial'; // موسمية / دائمة
  growthConditions?: {
    lightRequirement?: 'low' | 'medium' | 'high' | 'full_sun';
    temperature?: {
      min?: number;
      max?: number;
      optimal?: number;
    };
    soilType?: string;
  };
  location?: {
    greenhouse?: string; // بيت بلاستيكي
    row?: string; // صف
    area?: string; // منطقة
  };
  inspectionSchedule?: {
    frequency?: number; // days
    lastInspection?: string;
    nextInspection?: string;
    responsibleEmployee?: string;
  };
  inspectionNotes?: Array<{
    date: string;
    employee: string;
    notes: string;
  }>;
  wasteRecords?: Array<{
    date: string;
    quantity: number;
    reason: 'disease' | 'weather' | 'watering' | 'pest' | 'other';
    description: string;
  }>;
  expectedDemand?: {
    basedOnHistory?: number;
    recommendedProduction?: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
  };
  alerts?: Array<{
    type: 'growth_delay' | 'disease_outbreak' | 'watering_deficit' | 'temperature_issue' | 'other';
    severity: 'low' | 'medium' | 'high';
    message: string;
    date: string;
    resolved?: boolean;
  }>;
}

interface PlantingCycle {
  id: number;
  plantId: number;
  plantName: string;
  plantingDate: string;
  quantity: number;
  season: string;
  expectedHarvestDate: string;
  status: 'planned' | 'planted' | 'growing' | 'harvested';
}

type PlantCategory = 'all' | 'vegetable' | 'fruit' | 'flower' | 'medicinal' | 'tree' | 'accessories' | 'indoor' | 'other';
type ActiveTab = 'plants' | 'planting-cycles' | 'growth-tracking' | 'watering-fertilization' | 'health-management' | 'inventory-link' | 'reports' | 'classification' | 'growth-conditions' | 'location-management' | 'inspection-schedule' | 'waste-management' | 'demand-analysis' | 'permissions' | 'alerts';

export function ManagePlants() {
  const { user, isLoading, hasAccess } = useRequireRole(['manager', 'agricultural_engineer']);
  const navigate = useNavigate();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantingCycles, setPlantingCycles] = useState<PlantingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('plants');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPlantingCycleForm, setShowPlantingCycleForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [filterCategory, setFilterCategory] = useState<PlantCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [growthStageFilter, setGrowthStageFilter] = useState<'all' | 'seed' | 'seedling' | 'ready_for_sale'>('all');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    variety: '',
    season: '',
    growthDuration: '',
    price: '',
    description: '',
    imageUrl: '',
    category: ['other'] as string[],
    isPopular: false,
    quantity: 0,
    isActive: true,
    growthStage: 'seed' as 'seed' | 'seedling' | 'ready_for_sale',
    inventoryStatus: 'growing' as 'growing' | 'ready_for_inventory' | 'in_inventory',
    cost: '',
    revenue: '',
    // New classification fields
    plantType: 'vegetable' as 'ornamental' | 'vegetable' | 'fruit',
    locationType: 'outdoor' as 'indoor' | 'outdoor',
    lifecycleType: 'seasonal' as 'seasonal' | 'perennial',
    // Growth conditions
    lightRequirement: 'medium' as 'low' | 'medium' | 'high' | 'full_sun',
    temperatureMin: '',
    temperatureMax: '',
    temperatureOptimal: '',
    soilType: '',
    // Location
    greenhouse: '',
    row: '',
    area: '',
    // Inspection
    inspectionFrequency: '',
    responsibleEmployee: '',
  });

  const [plantingCycleData, setPlantingCycleData] = useState({
    plantId: '',
    plantingDate: '',
    quantity: '',
    season: '',
  });

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchPlants();
      fetchPlantingCycles();
    }
  }, [isLoading, hasAccess]);

  useEffect(() => {
    if (formData.imageUrl) {
      setImagePreview(formData.imageUrl);
    } else {
      setImagePreview('');
    }
  }, [formData.imageUrl]);

  const fetchPlants = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch plants');
      }

      const data = await response.json();
      const transformedPlants = data.map((plant: any) => ({
        id: plant.id,
        name: plant.name,
        variety: plant.variety || '',
        season: plant.season || '',
        growthDuration: plant.growth_duration || plant.growthDuration || 0,
        price: `₪${parseFloat(plant.base_price || 0).toFixed(2)}`,
        description: plant.description || '',
        imageUrl: plant.image_url || '',
        category: plant.category ? (typeof plant.category === 'string' ? plant.category.split(',') : plant.category) : ['other'],
        isPopular: plant.is_popular || false,
        quantity: plant.quantity || 0,
        isActive: plant.is_active !== false,
        growthStage: plant.growth_stage || plant.growthStage || 'seed',
        inventoryStatus: plant.inventory_status || plant.inventoryStatus || 'growing',
        cost: plant.cost || 0,
        revenue: plant.revenue || 0,
        wateringSchedule: plant.watering_schedule || plant.wateringSchedule,
        fertilizationSchedule: plant.fertilization_schedule || plant.fertilizationSchedule,
        healthStatus: plant.health_status || plant.healthStatus || 'healthy',
        healthIssues: plant.health_issues || plant.healthIssues || [],
      }));
      setPlants(transformedPlants);
    } catch (err) {
      setError('Failed to load plants. Please try again.');
      console.error('Error fetching plants:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlantingCycles = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/planting-cycles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlantingCycles(data);
      } else {
        // Mock data
        setPlantingCycles([
          {
            id: 1,
            plantId: 1,
            plantName: 'Tomato Seedling',
            plantingDate: '2024-01-15',
            quantity: 100,
            season: 'Spring',
            expectedHarvestDate: '2024-04-15',
            status: 'growing',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching planting cycles:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'category') {
      setFormData(prev => ({ ...prev, category: [value] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const plantData = {
        name: formData.name,
        variety: formData.variety,
        season: formData.season,
        growth_duration: parseInt(formData.growthDuration) || 0,
        price: formData.price,
        description: formData.description,
        imageUrl: formData.imageUrl,
        category: formData.category,
        isPopular: formData.isPopular,
        quantity: parseInt(formData.quantity.toString()) || 0,
        available: formData.isActive,
        isActive: formData.isActive,
        growth_stage: formData.growthStage,
        inventory_status: formData.inventoryStatus,
        cost: parseFloat(formData.cost) || 0,
        revenue: parseFloat(formData.revenue) || 0,
      };

      if (editingPlant) {
        // Update existing plant using savePlantUpdate
        const result = await savePlantUpdate(editingPlant.id, plantData);

        if (result.success && result.data) {
          // Update local state with returned data
          setPlants(prev => prev.map(p => {
            if (p.id === editingPlant.id) {
              return { ...p, ...result.data };
            }
            return p;
          }));
          setSuccess('Plant updated successfully!');
          setShowAddForm(false);
          setEditingPlant(null);
          resetForm();
          fetchPlants();
          setTimeout(() => setSuccess(''), 3000);
        } else {
          throw new Error(result.error || 'Failed to update plant');
        }
      } else {
        // Create new plant
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/plants`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(plantData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save plant');
        }

        const result = await response.json();
        if (result.success && result.data) {
          // Add new plant to local state
          setPlants(prev => [...prev, result.data]);
        }

        setSuccess('Plant added successfully!');
        setShowAddForm(false);
        setEditingPlant(null);
        resetForm();
        fetchPlants();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save plant. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePlantingCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const plantingDate = new Date(plantingCycleData.plantingDate);
      const growthDuration = plants.find(p => p.id === parseInt(plantingCycleData.plantId))?.growthDuration || 90;
      const expectedHarvestDate = new Date(plantingDate);
      expectedHarvestDate.setDate(expectedHarvestDate.getDate() + growthDuration);

      const response = await fetch(`${API_BASE_URL}/planting-cycles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plant_id: parseInt(plantingCycleData.plantId),
          planting_date: plantingCycleData.plantingDate,
          quantity: parseInt(plantingCycleData.quantity),
          season: plantingCycleData.season,
          expected_harvest_date: expectedHarvestDate.toISOString().split('T')[0],
          status: 'planned',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create planting cycle');
      }

      setSuccess('Planting cycle created successfully!');
      setShowPlantingCycleForm(false);
      setPlantingCycleData({
        plantId: '',
        plantingDate: '',
        quantity: '',
        season: '',
      });
      fetchPlantingCycles();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create planting cycle. Please try again.');
    }
  };

  const handleUpdateGrowthStage = async (plantId: number, newStage: 'seed' | 'seedling' | 'ready_for_sale') => {
    try {
      const result = await savePlantUpdate(plantId, { growth_stage: newStage });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, growthStage: newStage, ...result.data };
          }
          return p;
        }));
        setSuccess('Growth stage updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.error || 'Failed to update growth stage');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update growth stage. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateInventoryStatus = async (plantId: number, newStatus: 'growing' | 'ready_for_inventory' | 'in_inventory') => {
    try {
      const result = await savePlantUpdate(plantId, { inventory_status: newStatus });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, inventoryStatus: newStatus, ...result.data };
          }
          return p;
        }));
        setSuccess('Inventory status updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.error || 'Failed to update inventory status');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory status. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddHealthIssue = async (plantId: number, issue: { type: 'disease' | 'pest' | 'damage'; description: string }) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}/health-issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...issue,
          date: new Date().toISOString(),
          status: 'active',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add health issue');
      }

      setSuccess('Health issue added successfully!');
      fetchPlants();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to add health issue. Please try again.');
    }
  };

  const handleResolveHealthIssue = async (plantId: number, issueId: number, resolution: 'treated' | 'isolated' | 'destroyed') => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}/health-issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: resolution }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve health issue');
      }

      setSuccess('Health issue resolved successfully!');
      fetchPlants();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to resolve health issue. Please try again.');
    }
  };

  // Reusable function to save plant updates to database
  const savePlantUpdate = async (plantId: number, updateData: any): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log(`[Frontend] Saving plant ${plantId} update:`, updateData);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

  const handleUpdatePlantField = async (plantId: number, field: string, value: any) => {
    try {
      const result = await savePlantUpdate(plantId, { [field]: value });

      if (result.success && result.data) {
        // Update local state with returned data
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, [field]: value, ...result.data };
          }
          return p;
        }));
        setSuccess('Plant updated successfully!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        throw new Error(result.error || 'Failed to update plant field');
      }

      // Refresh to ensure sync
      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update plant field. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateGrowthCondition = async (plantId: number, field: string, value: any) => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const growthConditions = {
        ...plant.growthConditions,
        [field]: value,
      };

      const result = await savePlantUpdate(plantId, { growth_conditions: growthConditions });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, growthConditions, ...result.data };
          }
          return p;
        }));
        setSuccess('Growth condition updated successfully!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        throw new Error(result.error || 'Failed to update growth condition');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update growth condition. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateTemperature = async (plantId: number, field: 'min' | 'max' | 'optimal', value: string) => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const temperature = {
        ...plant.growthConditions?.temperature,
        [field]: value ? parseFloat(value) : undefined,
      };

      const growthConditions = {
        ...plant.growthConditions,
        temperature,
      };

      const result = await savePlantUpdate(plantId, { growth_conditions: growthConditions });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, growthConditions, ...result.data };
          }
          return p;
        }));
        setSuccess('Temperature updated successfully!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        throw new Error(result.error || 'Failed to update temperature');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update temperature. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateLocation = async (plantId: number, field: 'greenhouse' | 'row' | 'area', value: string) => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const location = {
        ...plant.location,
        [field]: value,
      };

      const result = await savePlantUpdate(plantId, { location });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, location, ...result.data };
          }
          return p;
        }));
        setSuccess('Location updated successfully!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        throw new Error(result.error || 'Failed to update location');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update location. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateInspection = async (plantId: number, field: string, value: any) => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const inspectionSchedule = {
        ...plant.inspectionSchedule,
        [field]: field === 'frequency' ? parseInt(value) || undefined : value,
      };

      if (field === 'frequency' && inspectionSchedule.frequency) {
        const nextInspection = new Date();
        nextInspection.setDate(nextInspection.getDate() + inspectionSchedule.frequency);
        inspectionSchedule.nextInspection = nextInspection.toISOString();
      }

      const result = await savePlantUpdate(plantId, { inspection_schedule: inspectionSchedule });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, inspectionSchedule, ...result.data };
          }
          return p;
        }));
        setSuccess('Inspection schedule updated successfully!');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        throw new Error(result.error || 'Failed to update inspection schedule');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update inspection schedule. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateDemand = async (plantId: number, action: 'increase' | 'decrease') => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant) return;

      const currentProduction = plant.expectedDemand?.recommendedProduction || 0;
      const newProduction = action === 'increase' 
        ? Math.ceil(currentProduction * 1.2)
        : Math.floor(currentProduction * 0.8);

      const expectedDemand = {
        ...plant.expectedDemand,
        recommendedProduction: newProduction,
      };

      const result = await savePlantUpdate(plantId, { expected_demand: expectedDemand });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, expectedDemand, ...result.data };
          }
          return p;
        }));
        setSuccess(`Production ${action === 'increase' ? 'increased' : 'decreased'} successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.error || 'Failed to update demand');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to update demand. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleResolveAlert = async (plantId: number, alertIndex: number) => {
    try {
      const plant = plants.find(p => p.id === plantId);
      if (!plant || !plant.alerts) return;

      const updatedAlerts = [...plant.alerts];
      updatedAlerts[alertIndex] = { ...updatedAlerts[alertIndex], resolved: true };

      const result = await savePlantUpdate(plantId, { alerts: updatedAlerts });

      if (result.success && result.data) {
        setPlants(prev => prev.map(p => {
          if (p.id === plantId) {
            return { ...p, alerts: updatedAlerts, ...result.data };
          }
          return p;
        }));
        setSuccess('Alert resolved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.error || 'Failed to resolve alert');
      }

      fetchPlants();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve alert. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this plant? This will remove it from sale.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete plant');
      }

      setSuccess('Plant deleted successfully!');
      fetchPlants();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete plant. Please try again.');
    }
  };

  const handleEdit = (plant: Plant) => {
    setEditingPlant(plant);
    setFormData({
      name: plant.name,
      variety: plant.variety || '',
      season: plant.season || '',
      growthDuration: plant.growthDuration?.toString() || '',
      price: plant.price.replace('₪', ''),
      description: plant.description,
      imageUrl: plant.imageUrl,
      category: Array.isArray(plant.category) ? plant.category : [plant.category],
      isPopular: plant.isPopular || false,
      quantity: plant.quantity || 0,
      isActive: plant.isActive !== false,
      growthStage: plant.growthStage || 'seed',
      inventoryStatus: plant.inventoryStatus || 'growing',
      cost: plant.cost?.toString() || '',
      revenue: plant.revenue?.toString() || '',
      plantType: plant.plantType || 'vegetable',
      locationType: plant.locationType || 'outdoor',
      lifecycleType: plant.lifecycleType || 'seasonal',
      lightRequirement: plant.growthConditions?.lightRequirement || 'medium',
      temperatureMin: plant.growthConditions?.temperature?.min?.toString() || '',
      temperatureMax: plant.growthConditions?.temperature?.max?.toString() || '',
      temperatureOptimal: plant.growthConditions?.temperature?.optimal?.toString() || '',
      soilType: plant.growthConditions?.soilType || '',
      greenhouse: plant.location?.greenhouse || '',
      row: plant.location?.row || '',
      area: plant.location?.area || '',
      inspectionFrequency: plant.inspectionSchedule?.frequency?.toString() || '',
      responsibleEmployee: plant.inspectionSchedule?.responsibleEmployee || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      variety: '',
      season: '',
      growthDuration: '',
      price: '',
      description: '',
      imageUrl: '',
      category: ['other'],
      isPopular: false,
      quantity: 0,
      isActive: true,
      growthStage: 'seed',
      inventoryStatus: 'growing',
      cost: '',
      revenue: '',
      plantType: 'vegetable',
      locationType: 'outdoor',
      lifecycleType: 'seasonal',
      lightRequirement: 'medium',
      temperatureMin: '',
      temperatureMax: '',
      temperatureOptimal: '',
      soilType: '',
      greenhouse: '',
      row: '',
      area: '',
      inspectionFrequency: '',
      responsibleEmployee: '',
    });
    setImagePreview('');
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingPlant(null);
    resetForm();
    setError('');
  };

  const filteredPlants = plants.filter(plant => {
    const categoryMatch = filterCategory === 'all' || 
      (Array.isArray(plant.category) ? plant.category.includes(filterCategory) : plant.category === filterCategory);
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'active' && plant.isActive) ||
      (statusFilter === 'inactive' && !plant.isActive);
    const growthStageMatch = growthStageFilter === 'all' || plant.growthStage === growthStageFilter;
    return categoryMatch && statusMatch && growthStageMatch;
  });

  // Calculate reports
  const totalPlants = plants.length;
  const plantsByStage = {
    seed: plants.filter(p => p.growthStage === 'seed').length,
    seedling: plants.filter(p => p.growthStage === 'seedling').length,
    ready_for_sale: plants.filter(p => p.growthStage === 'ready_for_sale').length,
  };
  const unhealthyPlants = plants.filter(p => p.healthStatus !== 'healthy').length;
  const wastePercentage = totalPlants > 0 ? ((unhealthyPlants / totalPlants) * 100).toFixed(1) : '0';
  
  const plantsWithProfit = plants.map(p => ({
    ...p,
    profit: (p.revenue || 0) - (p.cost || 0),
    profitMargin: p.revenue ? (((p.revenue - (p.cost || 0)) / p.revenue) * 100) : 0,
  }));

  const fastestGrowing = [...plants].sort((a, b) => (a.growthDuration || 999) - (b.growthDuration || 999)).slice(0, 5);
  const mostProfitable = [...plantsWithProfit].sort((a, b) => (b.profit || 0) - (a.profit || 0)).slice(0, 5);
  const leastProfitable = [...plantsWithProfit].filter(p => p.profit < 0).sort((a, b) => (a.profit || 0) - (b.profit || 0)).slice(0, 5);

  if (isLoading) {
    return (
      <div className="manage-plants-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const categories: PlantCategory[] = ['all', 'vegetable', 'fruit', 'flower', 'medicinal', 'tree', 'accessories', 'indoor', 'other'];
  const seasons = ['Spring', 'Summer', 'Fall', 'Winter', 'All Year'];

  return (
    <div className="manage-plants">
      <div className="manage-plants-content">
        <header className="manage-plants-header">
          <div className="header-left">
            <h1>Plant Management</h1>
            <p className="welcome-text">Comprehensive plant lifecycle management system</p>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn-secondary"
              onClick={() => navigate('/manager-dashboard')}
            >
              Back to Dashboard
            </button>
          <button 
            className="add-plant-btn"
            onClick={() => {
              setShowAddForm(true);
              setEditingPlant(null);
              resetForm();
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Plant
          </button>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Tabs */}
        <div className="plants-tabs">
          <button 
            className={`tab-btn ${activeTab === 'plants' ? 'active' : ''}`}
            onClick={() => setActiveTab('plants')}
          >
            Plants Data
          </button>
          <button 
            className={`tab-btn ${activeTab === 'planting-cycles' ? 'active' : ''}`}
            onClick={() => setActiveTab('planting-cycles')}
          >
            Planting Cycles
          </button>
          <button 
            className={`tab-btn ${activeTab === 'growth-tracking' ? 'active' : ''}`}
            onClick={() => setActiveTab('growth-tracking')}
          >
            Growth Tracking
          </button>
          <button 
            className={`tab-btn ${activeTab === 'watering-fertilization' ? 'active' : ''}`}
            onClick={() => setActiveTab('watering-fertilization')}
          >
            Watering & Fertilization
          </button>
          <button 
            className={`tab-btn ${activeTab === 'health-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('health-management')}
          >
            Health Management
          </button>
          <button 
            className={`tab-btn ${activeTab === 'inventory-link' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory-link')}
          >
            Inventory Link
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports & Analysis
          </button>
        </div>

        {/* Add/Edit Plant Form */}
        {showAddForm && (
          <div className="add-plant-form-container">
            <div className="add-plant-form-header">
              <h2>{editingPlant ? 'Edit Plant' : 'Add New Plant'}</h2>
              <button className="close-form-btn" onClick={cancelForm}>×</button>
            </div>
            <form className="add-plant-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Plant Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Tomato Seedling"
                  />
                </div>
                <div className="form-group">
                  <label>Variety *</label>
                  <input
                    type="text"
                    name="variety"
                    value={formData.variety}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Cherry Tomato"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Season *</label>
                  <select
                    name="season"
                    value={formData.season}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Season</option>
                    {seasons.map(season => (
                      <option key={season} value={season}>{season}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Growth Duration (Days) *</label>
                  <input
                    type="number"
                    name="growthDuration"
                    value={formData.growthDuration}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="e.g., 90"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (₪) *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g., 15.00"
                  />
                </div>
                <div className="form-group">
                  <label>Cost (₪)</label>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="Production cost"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  placeholder="Describe the plant..."
                />
              </div>

              <div className="form-group">
                <label>Image URL *</label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleImageUrlChange}
                  required
                  placeholder="https://example.com/image.jpg"
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" onError={() => setImagePreview('')} />
                    <p className="preview-label">Image Preview</p>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category[0] || 'other'}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="vegetable">Vegetable</option>
                    <option value="fruit">Fruit</option>
                    <option value="flower">Flower</option>
                    <option value="medicinal">Medicinal</option>
                    <option value="accessories">Accessories</option>
                    <option value="indoor">Indoor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Growth Stage *</label>
                  <select
                    name="growthStage"
                    value={formData.growthStage}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="seed">Seed</option>
                    <option value="seedling">Seedling</option>
                    <option value="ready_for_sale">Ready for Sale</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inventory Status *</label>
                  <select
                    name="inventoryStatus"
                    value={formData.inventoryStatus}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="growing">Growing</option>
                    <option value="ready_for_inventory">Ready for Inventory</option>
                    <option value="in_inventory">In Inventory</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity Available</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isPopular"
                      checked={formData.isPopular}
                      onChange={handleInputChange}
                    />
                    Mark as Popular
                  </label>
                </div>
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    Available for Sale
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={cancelForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingPlant ? 'Update Plant' : 'Add Plant'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Plants Data Tab */}
        {activeTab === 'plants' && (
          <>
        <div className="plants-filters">
          <div className="filter-group">
            <label>Filter by Category:</label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value as PlantCategory)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All Status</option>
              <option value="active">Available</option>
              <option value="inactive">Unavailable</option>
            </select>
          </div>
              <div className="filter-group">
                <label>Filter by Growth Stage:</label>
                <select 
                  value={growthStageFilter} 
                  onChange={(e) => setGrowthStageFilter(e.target.value as 'all' | 'seed' | 'seedling' | 'ready_for_sale')}
                >
                  <option value="all">All Stages</option>
                  <option value="seed">Seed</option>
                  <option value="seedling">Seedling</option>
                  <option value="ready_for_sale">Ready for Sale</option>
                </select>
              </div>
          <div className="plants-count">
            Showing {filteredPlants.length} of {plants.length} plants
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner-small"></div>
            <p>Loading plants...</p>
          </div>
        ) : filteredPlants.length === 0 ? (
          <div className="empty-state">
            <p>No plants found.</p>
          </div>
        ) : (
          <div className="plants-grid">
            {filteredPlants.map(plant => (
              <div key={plant.id} className={`plant-card ${!plant.isActive ? 'inactive' : ''}`}>
                <div className="plant-image">
                  <img src={plant.imageUrl} alt={plant.name} />
                  {!plant.isActive && <div className="inactive-badge">Not Available</div>}
                  {plant.isPopular && <div className="popular-badge">Popular</div>}
                      <div className={`growth-stage-badge ${plant.growthStage}`}>
                        {plant.growthStage === 'seed' ? '🌱 Seed' : 
                         plant.growthStage === 'seedling' ? '🌿 Seedling' : 
                         '✅ Ready'}
                      </div>
                </div>
                <div className="plant-info">
                  <h3>{plant.name}</h3>
                      {plant.variety && <p className="plant-variety">Variety: {plant.variety}</p>}
                      {plant.season && <p className="plant-season">Season: {plant.season}</p>}
                      {plant.growthDuration && <p className="plant-duration">Growth: {plant.growthDuration} days</p>}
                  <p className="plant-price">{plant.price}</p>
                  <p className="plant-description">{plant.description.substring(0, 100)}...</p>
                  <div className="plant-meta">
                    <span className="plant-category">
                      {Array.isArray(plant.category) ? plant.category.join(', ') : plant.category}
                    </span>
                    <span className="plant-quantity">Qty: {plant.quantity || 0}</span>
                  </div>
                  
                      <div className="plant-actions">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEdit(plant)}
                        >
                          Edit Details
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(plant.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Planting Cycles Tab */}
        {activeTab === 'planting-cycles' && (
          <div className="planting-cycles-section">
            <div className="section-header-bar">
              <h2>Planting Cycles Planning</h2>
              <button 
                className="add-cycle-btn"
                onClick={() => setShowPlantingCycleForm(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Plan New Cycle
              </button>
            </div>

            {showPlantingCycleForm && (
              <div className="cycle-form-container">
                <div className="form-header">
                  <h3>Create New Planting Cycle</h3>
                  <button className="close-btn" onClick={() => setShowPlantingCycleForm(false)}>×</button>
                </div>
                <form onSubmit={handlePlantingCycleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Plant *</label>
                      <select
                        value={plantingCycleData.plantId}
                        onChange={(e) => setPlantingCycleData(prev => ({ ...prev, plantId: e.target.value }))}
                        required
                      >
                        <option value="">Choose a plant</option>
                        {plants.map(plant => (
                          <option key={plant.id} value={plant.id}>
                            {plant.name} ({plant.variety || 'N/A'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Planting Date *</label>
                      <input
                        type="date"
                        value={plantingCycleData.plantingDate}
                        onChange={(e) => setPlantingCycleData(prev => ({ ...prev, plantingDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        value={plantingCycleData.quantity}
                        onChange={(e) => setPlantingCycleData(prev => ({ ...prev, quantity: e.target.value }))}
                        required
                        min="1"
                        placeholder="How many to plant?"
                      />
                    </div>
                    <div className="form-group">
                      <label>Season *</label>
                      <select
                        value={plantingCycleData.season}
                        onChange={(e) => setPlantingCycleData(prev => ({ ...prev, season: e.target.value }))}
                        required
                      >
                        <option value="">Select Season</option>
                        {seasons.map(season => (
                          <option key={season} value={season}>{season}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowPlantingCycleForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Create Cycle
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="cycles-grid">
              {plantingCycles.map(cycle => {
                const plant = plants.find(p => p.id === cycle.plantId);
                return (
                  <div key={cycle.id} className="cycle-card">
                    <div className="cycle-header">
                      <h3>{cycle.plantName}</h3>
                      <span className={`cycle-status ${cycle.status}`}>{cycle.status}</span>
                    </div>
                    <div className="cycle-details">
                      <div className="detail-item">
                        <label>Planting Date:</label>
                        <span>{new Date(cycle.plantingDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <label>Quantity:</label>
                        <span>{cycle.quantity} plants</span>
                      </div>
                      <div className="detail-item">
                        <label>Season:</label>
                        <span>{cycle.season}</span>
                      </div>
                      <div className="detail-item">
                        <label>Expected Harvest:</label>
                        <span>{new Date(cycle.expectedHarvestDate).toLocaleDateString()}</span>
                      </div>
                      {plant && (
                        <div className="detail-item">
                          <label>Growth Duration:</label>
                          <span>{plant.growthDuration || 'N/A'} days</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Growth Tracking Tab */}
        {activeTab === 'growth-tracking' && (
          <div className="growth-tracking-section">
            <div className="section-header-bar">
              <h2>Growth Stages Tracking</h2>
            </div>
            <div className="growth-stages-overview">
              <div className="stage-card seed">
                <div className="stage-icon">🌱</div>
                <div className="stage-count">{plantsByStage.seed}</div>
                <div className="stage-label">Seed Stage</div>
              </div>
              <div className="stage-card seedling">
                <div className="stage-icon">🌿</div>
                <div className="stage-count">{plantsByStage.seedling}</div>
                <div className="stage-label">Seedling Stage</div>
              </div>
              <div className="stage-card ready">
                <div className="stage-icon">✅</div>
                <div className="stage-count">{plantsByStage.ready_for_sale}</div>
                <div className="stage-label">Ready for Sale</div>
              </div>
            </div>
            <div className="plants-growth-list">
              {plants.map(plant => (
                <div key={plant.id} className="growth-item">
                  <div className="growth-plant-info">
                    <img src={plant.imageUrl} alt={plant.name} className="growth-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>{plant.variety || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="growth-stage-controls">
                    <select
                      value={plant.growthStage || 'seed'}
                      onChange={(e) => handleUpdateGrowthStage(plant.id, e.target.value as 'seed' | 'seedling' | 'ready_for_sale')}
                      className="stage-select"
                    >
                      <option value="seed">🌱 Seed</option>
                      <option value="seedling">🌿 Seedling</option>
                      <option value="ready_for_sale">✅ Ready for Sale</option>
                    </select>
                  </div>
                  {plant.growthDuration && (
                    <div className="growth-duration">
                      Duration: {plant.growthDuration} days
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Watering & Fertilization Tab */}
        {activeTab === 'watering-fertilization' && (
          <div className="watering-section">
            <div className="section-header-bar">
              <h2>Watering & Fertilization Management</h2>
            </div>
            <div className="schedule-grid">
              {plants.map(plant => (
                <div key={plant.id} className="schedule-card">
                  <div className="schedule-plant-header">
                    <img src={plant.imageUrl} alt={plant.name} className="schedule-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>{plant.variety || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="schedule-details">
                    <div className="schedule-item watering">
                      <h5>💧 Watering Schedule</h5>
                      <div className="schedule-info">
                        <span>Frequency: Every {plant.wateringSchedule?.frequency || 3} days</span>
                        {plant.wateringSchedule?.nextWatering && (
                          <span>Next: {new Date(plant.wateringSchedule.nextWatering).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="schedule-item fertilization">
                      <h5>🌿 Fertilization Schedule</h5>
                      <div className="schedule-info">
                        <span>Frequency: Every {plant.fertilizationSchedule?.frequency || 14} days</span>
                        {plant.fertilizationSchedule?.nextFertilization && (
                          <span>Next: {new Date(plant.fertilizationSchedule.nextFertilization).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Management Tab */}
        {activeTab === 'health-management' && (
          <div className="health-management-section">
            <div className="section-header-bar">
              <h2>Plant Health Management</h2>
            </div>
            <div className="health-overview">
              <div className="health-stat healthy">
                <div className="stat-value">{plants.filter(p => p.healthStatus === 'healthy').length}</div>
                <div className="stat-label">Healthy Plants</div>
              </div>
              <div className="health-stat diseased">
                <div className="stat-value">{plants.filter(p => p.healthStatus === 'diseased').length}</div>
                <div className="stat-label">Diseased</div>
              </div>
              <div className="health-stat pest">
                <div className="stat-value">{plants.filter(p => p.healthStatus === 'pest_infested').length}</div>
                <div className="stat-label">Pest Infested</div>
              </div>
              <div className="health-stat damaged">
                <div className="stat-value">{plants.filter(p => p.healthStatus === 'damaged').length}</div>
                <div className="stat-label">Damaged</div>
              </div>
            </div>
            <div className="health-issues-list">
              {plants.filter(p => p.healthStatus !== 'healthy' || (p.healthIssues && p.healthIssues.length > 0)).map(plant => (
                <div key={plant.id} className="health-issue-card">
                  <div className="issue-plant-info">
                    <img src={plant.imageUrl} alt={plant.name} className="issue-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <span className={`health-status-badge ${plant.healthStatus}`}>
                        {plant.healthStatus === 'healthy' ? 'Healthy' :
                         plant.healthStatus === 'diseased' ? 'Diseased' :
                         plant.healthStatus === 'pest_infested' ? 'Pest Infested' : 'Damaged'}
                      </span>
                    </div>
                  </div>
                  {plant.healthIssues && plant.healthIssues.length > 0 && (
                    <div className="issues-list">
                      {plant.healthIssues.map((issue, idx) => (
                        <div key={idx} className="issue-item">
                          <div className="issue-type">{issue.type}</div>
                          <div className="issue-description">{issue.description}</div>
                          <div className="issue-date">{new Date(issue.date).toLocaleDateString()}</div>
                          <div className="issue-status">{issue.status}</div>
                          {issue.status === 'active' && (
                            <div className="issue-actions">
                              <button onClick={() => handleResolveHealthIssue(plant.id, idx, 'treated')}>Treat</button>
                              <button onClick={() => handleResolveHealthIssue(plant.id, idx, 'isolated')}>Isolate</button>
                              <button onClick={() => handleResolveHealthIssue(plant.id, idx, 'destroyed')}>Destroy</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Link Tab */}
        {activeTab === 'inventory-link' && (
          <div className="inventory-link-section">
            <div className="section-header-bar">
              <h2>Link Plants to Inventory</h2>
            </div>
            <div className="inventory-status-overview">
              <div className="status-card growing">
                <div className="status-count">{plants.filter(p => p.inventoryStatus === 'growing').length}</div>
                <div className="status-label">Growing</div>
              </div>
              <div className="status-card ready">
                <div className="status-count">{plants.filter(p => p.inventoryStatus === 'ready_for_inventory').length}</div>
                <div className="status-label">Ready for Inventory</div>
              </div>
              <div className="status-card in-inventory">
                <div className="status-count">{plants.filter(p => p.inventoryStatus === 'in_inventory').length}</div>
                <div className="status-label">In Inventory</div>
              </div>
            </div>
            <div className="inventory-plants-list">
              {plants.map(plant => (
                <div key={plant.id} className="inventory-plant-item">
                  <div className="inventory-plant-info">
                    <img src={plant.imageUrl} alt={plant.name} className="inventory-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>Stage: {plant.growthStage === 'seed' ? '🌱 Seed' : 
                                  plant.growthStage === 'seedling' ? '🌿 Seedling' : 
                                  '✅ Ready'}</p>
                    </div>
                  </div>
                  <div className="inventory-status-control">
                    <select
                      value={plant.inventoryStatus || 'growing'}
                      onChange={(e) => handleUpdateInventoryStatus(plant.id, e.target.value as 'growing' | 'ready_for_inventory' | 'in_inventory')}
                      className="inventory-status-select"
                    >
                      <option value="growing">Growing</option>
                      <option value="ready_for_inventory">Ready for Inventory</option>
                      <option value="in_inventory">In Inventory</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports & Analysis Tab */}
        {activeTab === 'reports' && (
          <div className="reports-section">
            <div className="section-header-bar">
              <h2>Reports & Analysis</h2>
            </div>
            <div className="reports-grid">
              <div className="report-card">
                <h3>Waste Percentage</h3>
                <div className="waste-percentage">
                  <div className="percentage-value">{wastePercentage}%</div>
                  <div className="percentage-details">
                    {unhealthyPlants} unhealthy out of {totalPlants} total plants
                  </div>
                </div>
              </div>

              <div className="report-card">
                <h3>Fastest Growing Plants</h3>
                <div className="fastest-growing-list">
                  {fastestGrowing.map((plant, idx) => (
                    <div key={plant.id} className="ranking-item">
                      <span className="rank">#{idx + 1}</span>
                      <div className="item-info">
                        <strong>{plant.name}</strong>
                        <span>{plant.growthDuration || 'N/A'} days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-card">
                <h3>Most Profitable Plants</h3>
                <div className="profitable-list">
                  {mostProfitable.map((plant, idx) => (
                    <div key={plant.id} className="ranking-item">
                      <span className="rank">#{idx + 1}</span>
                      <div className="item-info">
                        <strong>{plant.name}</strong>
                        <span>Profit: ₪{plant.profit?.toFixed(2) || '0.00'} ({plant.profitMargin?.toFixed(1) || '0'}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-card">
                <h3>Least Profitable / Loss-Making Plants</h3>
                <div className="loss-making-list">
                  {leastProfitable.length > 0 ? (
                    leastProfitable.map((plant, idx) => (
                      <div key={plant.id} className="ranking-item loss">
                        <span className="rank">#{idx + 1}</span>
                        <div className="item-info">
                          <strong>{plant.name}</strong>
                          <span>Loss: ₪{Math.abs(plant.profit || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-loss">No loss-making plants</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Classification Tab */}
        {activeTab === 'classification' && (
          <div className="classification-section">
            <div className="section-header-bar">
              <h2>Plant Classification & Organization</h2>
            </div>
            <div className="classification-grid">
              {plants.map(plant => (
                <div key={plant.id} className="classification-card">
                  <div className="classification-plant-header">
                    <img src={plant.imageUrl} alt={plant.name} className="classification-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>{plant.variety || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="classification-details">
                    <div className="classification-item">
                      <label>Plant Type:</label>
                      <select
                        value={plant.plantType || 'vegetable'}
                        onChange={(e) => handleUpdatePlantField(plant.id, 'plantType', e.target.value)}
                        className="classification-select"
                      >
                        <option value="ornamental">Ornamental (زينة)</option>
                        <option value="vegetable">Vegetable (خضار)</option>
                        <option value="fruit">Fruit (فواكه)</option>
                      </select>
                    </div>
                    <div className="classification-item">
                      <label>Location Type:</label>
                      <select
                        value={plant.locationType || 'outdoor'}
                        onChange={(e) => handleUpdatePlantField(plant.id, 'locationType', e.target.value)}
                        className="classification-select"
                      >
                        <option value="indoor">Indoor (داخلية)</option>
                        <option value="outdoor">Outdoor (خارجية)</option>
                      </select>
                    </div>
                    <div className="classification-item">
                      <label>Lifecycle Type:</label>
                      <select
                        value={plant.lifecycleType || 'seasonal'}
                        onChange={(e) => handleUpdatePlantField(plant.id, 'lifecycleType', e.target.value)}
                        className="classification-select"
                      >
                        <option value="seasonal">Seasonal (موسمية)</option>
                        <option value="perennial">Perennial (دائمة)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Conditions Tab */}
        {activeTab === 'growth-conditions' && (
          <div className="growth-conditions-section">
            <div className="section-header-bar">
              <h2>Growth Conditions Management</h2>
            </div>
            <div className="conditions-grid">
              {plants.map(plant => (
                <div key={plant.id} className="conditions-card">
                  <div className="conditions-plant-header">
                    <img src={plant.imageUrl} alt={plant.name} className="conditions-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                    </div>
                  </div>
                  <div className="conditions-details">
                    <div className="condition-group">
                      <h5>Light Requirements</h5>
                      <select
                        value={plant.growthConditions?.lightRequirement || 'medium'}
                        onChange={(e) => handleUpdateGrowthCondition(plant.id, 'lightRequirement', e.target.value)}
                        className="condition-select"
                      >
                        <option value="low">Low Light</option>
                        <option value="medium">Medium Light</option>
                        <option value="high">High Light</option>
                        <option value="full_sun">Full Sun</option>
                      </select>
                    </div>
                    <div className="condition-group">
                      <h5>Temperature (°C)</h5>
                      <div className="temperature-inputs">
                        <div>
                          <label>Min:</label>
                          <input
                            type="number"
                            value={plant.growthConditions?.temperature?.min || ''}
                            onChange={(e) => handleUpdateTemperature(plant.id, 'min', e.target.value)}
                            placeholder="Min"
                            className="temp-input"
                          />
                        </div>
                        <div>
                          <label>Optimal:</label>
                          <input
                            type="number"
                            value={plant.growthConditions?.temperature?.optimal || ''}
                            onChange={(e) => handleUpdateTemperature(plant.id, 'optimal', e.target.value)}
                            placeholder="Optimal"
                            className="temp-input"
                          />
                        </div>
                        <div>
                          <label>Max:</label>
                          <input
                            type="number"
                            value={plant.growthConditions?.temperature?.max || ''}
                            onChange={(e) => handleUpdateTemperature(plant.id, 'max', e.target.value)}
                            placeholder="Max"
                            className="temp-input"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="condition-group">
                      <h5>Soil Type</h5>
                      <input
                        type="text"
                        value={plant.growthConditions?.soilType || ''}
                        onChange={(e) => handleUpdateGrowthCondition(plant.id, 'soilType', e.target.value)}
                        placeholder="e.g., Sandy, Loamy, Clay"
                        className="condition-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location Management Tab */}
        {activeTab === 'location-management' && (
          <div className="location-management-section">
            <div className="section-header-bar">
              <h2>Location Management in Nursery</h2>
            </div>
            <div className="location-overview">
              <div className="location-stat">
                <div className="stat-value">{new Set(plants.map(p => p.location?.greenhouse).filter(Boolean)).size}</div>
                <div className="stat-label">Greenhouses</div>
              </div>
              <div className="location-stat">
                <div className="stat-value">{new Set(plants.map(p => p.location?.row).filter(Boolean)).size}</div>
                <div className="stat-label">Rows</div>
              </div>
              <div className="location-stat">
                <div className="stat-value">{new Set(plants.map(p => p.location?.area).filter(Boolean)).size}</div>
                <div className="stat-label">Areas</div>
              </div>
            </div>
            <div className="location-plants-list">
              {plants.map(plant => (
                <div key={plant.id} className="location-plant-item">
                  <div className="location-plant-info">
                    <img src={plant.imageUrl} alt={plant.name} className="location-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>{plant.variety || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="location-inputs">
                    <div className="location-input-group">
                      <label>Greenhouse (بيت بلاستيكي):</label>
                      <input
                        type="text"
                        value={plant.location?.greenhouse || ''}
                        onChange={(e) => handleUpdateLocation(plant.id, 'greenhouse', e.target.value)}
                        placeholder="e.g., GH-1"
                        className="location-input"
                      />
                    </div>
                    <div className="location-input-group">
                      <label>Row (صف):</label>
                      <input
                        type="text"
                        value={plant.location?.row || ''}
                        onChange={(e) => handleUpdateLocation(plant.id, 'row', e.target.value)}
                        placeholder="e.g., Row-A"
                        className="location-input"
                      />
                    </div>
                    <div className="location-input-group">
                      <label>Area (منطقة):</label>
                      <input
                        type="text"
                        value={plant.location?.area || ''}
                        onChange={(e) => handleUpdateLocation(plant.id, 'area', e.target.value)}
                        placeholder="e.g., North Area"
                        className="location-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inspection Schedule Tab */}
        {activeTab === 'inspection-schedule' && (
          <div className="inspection-schedule-section">
            <div className="section-header-bar">
              <h2>Periodic Inspection Schedule</h2>
            </div>
            <div className="inspection-overview">
              <div className="inspection-stat">
                <div className="stat-value">{plants.filter(p => p.inspectionSchedule?.nextInspection && new Date(p.inspectionSchedule.nextInspection) <= new Date()).length}</div>
                <div className="stat-label">Due for Inspection</div>
              </div>
              <div className="inspection-stat">
                <div className="stat-value">{plants.filter(p => p.inspectionSchedule).length}</div>
                <div className="stat-label">Scheduled Plants</div>
              </div>
            </div>
            <div className="inspection-plants-list">
              {plants.map(plant => (
                <div key={plant.id} className="inspection-plant-item">
                  <div className="inspection-plant-info">
                    <img src={plant.imageUrl} alt={plant.name} className="inspection-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>{plant.variety || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="inspection-settings">
                    <div className="inspection-input-group">
                      <label>Frequency (days):</label>
                      <input
                        type="number"
                        value={plant.inspectionSchedule?.frequency || ''}
                        onChange={(e) => handleUpdateInspection(plant.id, 'frequency', e.target.value)}
                        placeholder="e.g., 7"
                        min="1"
                        className="inspection-input"
                      />
                    </div>
                    <div className="inspection-input-group">
                      <label>Responsible Employee:</label>
                      <input
                        type="text"
                        value={plant.inspectionSchedule?.responsibleEmployee || ''}
                        onChange={(e) => handleUpdateInspection(plant.id, 'responsibleEmployee', e.target.value)}
                        placeholder="Employee name"
                        className="inspection-input"
                      />
                    </div>
                    {plant.inspectionSchedule?.nextInspection && (
                      <div className="inspection-next">
                        <span>Next Inspection: {new Date(plant.inspectionSchedule.nextInspection).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {plant.inspectionNotes && plant.inspectionNotes.length > 0 && (
                    <div className="inspection-notes">
                      <h5>Recent Notes:</h5>
                      {plant.inspectionNotes.slice(-3).map((note, idx) => (
                        <div key={idx} className="note-item">
                          <span className="note-date">{new Date(note.date).toLocaleDateString()}</span>
                          <span className="note-employee">{note.employee}</span>
                          <p>{note.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waste Management Tab */}
        {activeTab === 'waste-management' && (
          <div className="waste-management-section">
            <div className="section-header-bar">
              <h2>Waste & Damage Management</h2>
            </div>
            <div className="waste-overview">
              <div className="waste-stat">
                <div className="stat-value">
                  {plants.reduce((sum, p) => sum + (p.wasteRecords?.reduce((s, w) => s + w.quantity, 0) || 0), 0)}
                </div>
                <div className="stat-label">Total Wasted Plants</div>
              </div>
              <div className="waste-stat">
                <div className="stat-value">
                  {plants.filter(p => p.wasteRecords && p.wasteRecords.length > 0).length}
                </div>
                <div className="stat-label">Plants with Waste Records</div>
              </div>
            </div>
            <div className="waste-plants-list">
              {plants.filter(p => p.wasteRecords && p.wasteRecords.length > 0).map(plant => (
                <div key={plant.id} className="waste-plant-item">
                  <div className="waste-plant-info">
                    <img src={plant.imageUrl} alt={plant.name} className="waste-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>Total Wasted: {plant.wasteRecords?.reduce((sum, w) => sum + w.quantity, 0) || 0} plants</p>
                    </div>
                  </div>
                  <div className="waste-records">
                    <h5>Waste Records:</h5>
                    {plant.wasteRecords?.map((record, idx) => (
                      <div key={idx} className="waste-record-item">
                        <div className="waste-record-header">
                          <span className="waste-date">{new Date(record.date).toLocaleDateString()}</span>
                          <span className="waste-quantity">{record.quantity} plants</span>
                          <span className={`waste-reason ${record.reason}`}>{record.reason}</span>
                        </div>
                        <p className="waste-description">{record.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demand Analysis Tab */}
        {activeTab === 'demand-analysis' && (
          <div className="demand-analysis-section">
            <div className="section-header-bar">
              <h2>Demand Analysis & Production Planning</h2>
            </div>
            <div className="demand-grid">
              {plants.map(plant => (
                <div key={plant.id} className="demand-card">
                  <div className="demand-plant-header">
                    <img src={plant.imageUrl} alt={plant.name} className="demand-plant-image" />
                    <div>
                      <h4>{plant.name}</h4>
                      <p>{plant.variety || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="demand-details">
                    {plant.expectedDemand && (
                      <>
                        <div className="demand-item">
                          <label>Based on History:</label>
                          <span>{plant.expectedDemand.basedOnHistory || 'N/A'} units</span>
                        </div>
                        <div className="demand-item">
                          <label>Recommended Production:</label>
                          <span>{plant.expectedDemand.recommendedProduction || 'N/A'} units</span>
                        </div>
                        <div className="demand-item">
                          <label>Trend:</label>
                          <span className={`demand-trend ${plant.expectedDemand.trend}`}>
                            {plant.expectedDemand.trend === 'increasing' ? '📈 Increasing' :
                             plant.expectedDemand.trend === 'decreasing' ? '📉 Decreasing' :
                             '➡️ Stable'}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="demand-actions">
                    <button 
                        className="increase-btn"
                        onClick={() => handleUpdateDemand(plant.id, 'increase')}
                    >
                        Increase Production
                    </button>
                    <button 
                        className="decrease-btn"
                        onClick={() => handleUpdateDemand(plant.id, 'decrease')}
                    >
                        Decrease Production
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="permissions-section">
            <div className="section-header-bar">
              <h2>Employee Permissions Control</h2>
            </div>
            <div className="permissions-grid">
              <div className="permission-role-card">
                <h3>Growth Recording</h3>
                <p>Who can record plant growth stages</p>
                <select className="permission-select">
                  <option>Manager Only</option>
                  <option>Manager + Nursery Workers</option>
                  <option>All Employees</option>
                </select>
              </div>
              <div className="permission-role-card">
                <h3>Data Modification</h3>
                <p>Who can edit plant data</p>
                <select className="permission-select">
                  <option>Manager Only</option>
                  <option>Manager + Senior Staff</option>
                  <option>Manager + All Staff</option>
                </select>
              </div>
              <div className="permission-role-card">
                <h3>View Only</h3>
                <p>Who can view plant information</p>
                <select className="permission-select">
                  <option>All Employees</option>
                  <option>Manager + Senior Staff</option>
                  <option>Manager Only</option>
                </select>
              </div>
              <div className="permission-role-card">
                <h3>Inspection Notes</h3>
                <p>Who can add inspection notes</p>
                <select className="permission-select">
                  <option>Manager + Inspectors</option>
                  <option>All Employees</option>
                  <option>Manager Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="alerts-section">
            <div className="section-header-bar">
              <h2>Alerts & Decision Making</h2>
            </div>
            <div className="alerts-overview">
              <div className="alert-stat high">
                <div className="stat-value">
                  {plants.reduce((sum, p) => sum + (p.alerts?.filter(a => !a.resolved && a.severity === 'high').length || 0), 0)}
                </div>
                <div className="stat-label">High Priority</div>
              </div>
              <div className="alert-stat medium">
                <div className="stat-value">
                  {plants.reduce((sum, p) => sum + (p.alerts?.filter(a => !a.resolved && a.severity === 'medium').length || 0), 0)}
                </div>
                <div className="stat-label">Medium Priority</div>
              </div>
              <div className="alert-stat low">
                <div className="stat-value">
                  {plants.reduce((sum, p) => sum + (p.alerts?.filter(a => !a.resolved && a.severity === 'low').length || 0), 0)}
                </div>
                <div className="stat-label">Low Priority</div>
              </div>
            </div>
            <div className="alerts-list">
              {plants
                .filter(p => p.alerts && p.alerts.length > 0)
                .map(plant => 
                  plant.alerts?.filter(a => !a.resolved).map((alert, idx) => (
                    <div key={`${plant.id}-${idx}`} className={`alert-item ${alert.severity}`}>
                      <div className="alert-header">
                        <div className="alert-plant-info">
                          <img src={plant.imageUrl} alt={plant.name} className="alert-plant-image" />
                          <div>
                            <h4>{plant.name}</h4>
                            <span className="alert-type">{alert.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <span className={`alert-severity ${alert.severity}`}>{alert.severity}</span>
                      </div>
                      <p className="alert-message">{alert.message}</p>
                      <div className="alert-footer">
                        <span className="alert-date">{new Date(alert.date).toLocaleDateString()}</span>
                        <button 
                          className="resolve-btn"
                          onClick={() => handleResolveAlert(plant.id, idx)}
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )
                .flat()
                .filter(Boolean)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


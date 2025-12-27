import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireRole } from '../utils/useAuth';
import './InventoryManagement.css';

interface InventoryItem {
  id: number;
  plant_id?: number;
  name: string;
  sku: string;
  quantity_on_hand: number;
  reorder_level: number;
  location?: string;
  imageUrl?: string;
  category?: string;
  isLowStock: boolean;
  // New fields
  warehouseLocation?: {
    zone?: string; // منطقة
    aisle?: string; // ممر
    shelf?: string; // رف
    bin?: string; // صندوق
  };
  receivedDate?: string;
  expiryDate?: string;
  qualityStatus?: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  qualityCheck?: {
    date: string;
    checkedBy: string;
    notes: string;
    passed: boolean;
  };
  movementHistory?: Array<{
    date: string;
    type: 'in' | 'out' | 'transfer' | 'adjustment';
    quantity: number;
    reason: string;
    employee: string;
  }>;
  supplier?: {
    name: string;
    contact: string;
    leadTime: number; // days
  };
  plannedOrder?: {
    quantity: number;
    expectedDate: string;
    status: 'planned' | 'ordered' | 'in_transit' | 'received';
  };
  safetyCompliance?: {
    temperature?: number;
    humidity?: number;
    lastInspection?: string;
    issues?: string[];
  };
  cost?: number;
  totalValue?: number;
}

interface InventoryPlanning {
  id: number;
  itemId: number;
  itemName: string;
  requiredQuantity: number;
  currentQuantity: number;
  plannedOrderDate: string;
  expectedDeliveryDate: string;
  status: 'planned' | 'ordered' | 'received';
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

interface ReceivingRecord {
  id: number;
  itemId: number;
  itemName: string;
  receivedQuantity: number;
  receivedDate: string;
  receivedBy: string;
  qualityCheck: {
    passed: boolean;
    notes: string;
    checkedBy: string;
  };
  supplier: string;
  invoiceNumber?: string;
}

interface WarehouseTeam {
  id: string;
  name: string;
  role: string;
  assignedTasks: string[];
  shift: string;
}

type ActiveTab = 'planning' | 'receiving' | 'storage' | 'monitoring' | 'orders' | 'team' | 'reports' | 'safety';

export function InventoryManagement() {
  const { user, isLoading, hasAccess } = useRequireRole('manager');
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryPlans, setInventoryPlans] = useState<InventoryPlanning[]>([]);
  const [receivingRecords, setReceivingRecords] = useState<ReceivingRecord[]>([]);
  const [warehouseTeam, setWarehouseTeam] = useState<WarehouseTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('planning');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Reports data
  const [orders, setOrders] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [reportSubTab, setReportSubTab] = useState<'inventory' | 'orders' | 'employees' | 'plants'>('inventory');

  // Forms state
  const [showPlanningForm, setShowPlanningForm] = useState(false);
  const [showReceivingForm, setShowReceivingForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [planningForm, setPlanningForm] = useState({
    itemId: '',
    requiredQuantity: '',
    plannedOrderDate: '',
    expectedDeliveryDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    reason: '',
  });

  const [receivingForm, setReceivingForm] = useState({
    itemId: '',
    receivedQuantity: '',
    receivedDate: new Date().toISOString().split('T')[0],
    receivedBy: '',
    qualityPassed: true,
    qualityNotes: '',
    supplier: '',
    invoiceNumber: '',
  });

  const [orderForm, setOrderForm] = useState({
    itemId: '',
    quantity: '',
    expectedDate: '',
    supplier: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchInventory();
      fetchInventoryPlans();
      fetchReceivingRecords();
      fetchWarehouseTeam();
      fetchOrders();
      fetchEmployees();
      fetchPlants();
    }
  }, [isLoading, hasAccess]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const plantsResponse = await fetch(`${API_BASE_URL}/plants/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const inventoryResponse = await fetch(`${API_BASE_URL}/inventory`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (plantsResponse.ok && inventoryResponse.ok) {
        const plantsData = await plantsResponse.json();
        const inventoryData = await inventoryResponse.json();

        const combinedData: InventoryItem[] = plantsData.map((plant: any) => {
          const inventoryItem = inventoryData.find((inv: any) => inv.plant_id === plant.id);
          const quantity = inventoryItem?.quantity_on_hand || plant.quantity || 0;
          const reorderLevel = inventoryItem?.reorder_level || 10;
          const isLowStock = quantity <= reorderLevel;

          return {
            id: inventoryItem?.id || plant.id,
            plant_id: plant.id,
            name: plant.name,
            sku: plant.sku || `PLANT-${plant.id}`,
            quantity_on_hand: quantity,
            reorder_level: reorderLevel,
            location: inventoryItem?.location || 'N/A',
            imageUrl: plant.image_url,
            category: plant.category,
            isLowStock,
            warehouseLocation: inventoryItem?.warehouse_location || {
              zone: 'A',
              aisle: '1',
              shelf: '1',
              bin: '1',
            },
            qualityStatus: inventoryItem?.quality_status || 'good',
            movementHistory: inventoryItem?.movement_history || [],
            supplier: inventoryItem?.supplier,
            plannedOrder: inventoryItem?.planned_order,
            safetyCompliance: inventoryItem?.safety_compliance,
            cost: inventoryItem?.cost || 0,
            totalValue: (inventoryItem?.cost || 0) * quantity,
          };
        });

        setInventory(combinedData);
      } else {
        // Mock data
        setInventory([
          {
            id: 1,
            plant_id: 1,
            name: 'Tomato Seedling',
            sku: 'TOM-001',
            quantity_on_hand: 12,
            reorder_level: 20,
            location: 'A1',
            isLowStock: true,
            warehouseLocation: { zone: 'A', aisle: '1', shelf: '1', bin: '1' },
            qualityStatus: 'good',
            movementHistory: [],
            cost: 5,
            totalValue: 60,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryPlans = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory/planning`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInventoryPlans(data);
      } else {
        // Mock data
        setInventoryPlans([]);
      }
    } catch (error) {
      console.error('Error fetching inventory plans:', error);
    }
  };

  const fetchReceivingRecords = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory/receiving`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReceivingRecords(data);
      } else {
        // Mock data
        setReceivingRecords([]);
      }
    } catch (error) {
      console.error('Error fetching receiving records:', error);
    }
  };

  const fetchWarehouseTeam = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/warehouse/team`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWarehouseTeam(data);
      } else {
        // Mock data
        setWarehouseTeam([
          {
            id: '1',
            name: 'Ahmed Ali',
            role: 'Warehouse Supervisor',
            assignedTasks: ['Receiving', 'Quality Check'],
            shift: 'Morning',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching warehouse team:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        // Mock data
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else {
        // Mock data
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const fetchPlants = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/plants/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlants(data);
      } else {
        // Mock data
        setPlants([]);
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
      setPlants([]);
    }
  };

  const handlePlanningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory/planning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_id: parseInt(planningForm.itemId),
          required_quantity: parseInt(planningForm.requiredQuantity),
          planned_order_date: planningForm.plannedOrderDate,
          expected_delivery_date: planningForm.expectedDeliveryDate,
          priority: planningForm.priority,
          reason: planningForm.reason,
          status: 'planned',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create inventory plan');
      }

      setSuccess('Inventory plan created successfully!');
      setShowPlanningForm(false);
      setPlanningForm({
        itemId: '',
        requiredQuantity: '',
        plannedOrderDate: '',
        expectedDeliveryDate: '',
        priority: 'medium',
        reason: '',
      });
      fetchInventoryPlans();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create inventory plan. Please try again.');
    }
  };

  const handleReceivingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory/receiving`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_id: parseInt(receivingForm.itemId),
          received_quantity: parseInt(receivingForm.receivedQuantity),
          received_date: receivingForm.receivedDate,
          received_by: receivingForm.receivedBy,
          quality_check: {
            passed: receivingForm.qualityPassed,
            notes: receivingForm.qualityNotes,
            checked_by: user?.email || 'Manager',
          },
          supplier: receivingForm.supplier,
          invoice_number: receivingForm.invoiceNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to record receiving');
      }

      // Update inventory quantity
      const item = inventory.find(i => i.id === parseInt(receivingForm.itemId));
      if (item) {
        await handleUpdateQuantity(item.id, item.quantity_on_hand + parseInt(receivingForm.receivedQuantity));
      }

      setSuccess('Receiving recorded successfully!');
      setShowReceivingForm(false);
      setReceivingForm({
        itemId: '',
        receivedQuantity: '',
        receivedDate: new Date().toISOString().split('T')[0],
        receivedBy: '',
        qualityPassed: true,
        qualityNotes: '',
        supplier: '',
        invoiceNumber: '',
      });
      fetchReceivingRecords();
      fetchInventory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to record receiving. Please try again.');
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const item = inventory.find(i => i.id === parseInt(orderForm.itemId));
      if (!item) return;

      const response = await fetch(`${API_BASE_URL}/inventory/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_id: parseInt(orderForm.itemId),
          quantity: parseInt(orderForm.quantity),
          expected_date: orderForm.expectedDate,
          supplier: orderForm.supplier,
          priority: orderForm.priority,
          status: 'ordered',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      // Update item's planned order
      await handleUpdatePlannedOrder(parseInt(orderForm.itemId), {
        quantity: parseInt(orderForm.quantity),
        expectedDate: orderForm.expectedDate,
        status: 'ordered',
      });

      setSuccess('Order created successfully!');
      setShowOrderForm(false);
      setOrderForm({
        itemId: '',
        quantity: '',
        expectedDate: '',
        supplier: '',
        priority: 'medium',
      });
      fetchInventory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create order. Please try again.');
    }
  };

  const handleUpdateQuantity = async (id: number, newQuantity: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const item = inventory.find(i => i.id === id);
      if (!item) return;

      const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity_on_hand: newQuantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      setSuccess('Quantity updated successfully!');
      fetchInventory();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError('Failed to update quantity. Please try again.');
    }
  };

  const handleUpdateWarehouseLocation = async (id: number, location: any) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ warehouse_location: location }),
      });

      if (!response.ok) {
        throw new Error('Failed to update warehouse location');
      }

      setSuccess('Warehouse location updated successfully!');
      fetchInventory();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError('Failed to update warehouse location. Please try again.');
    }
  };

  const handleUpdateQualityStatus = async (id: number, status: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged', notes: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory/${id}/quality`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          quality_status: status,
          quality_check: {
            date: new Date().toISOString(),
            checked_by: user?.email || 'Manager',
            notes,
            passed: status !== 'poor' && status !== 'damaged',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quality status');
      }

      setSuccess('Quality status updated successfully!');
      fetchInventory();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError('Failed to update quality status. Please try again.');
    }
  };

  const handleUpdatePlannedOrder = async (id: number, order: any) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planned_order: order }),
      });

      if (!response.ok) {
        throw new Error('Failed to update planned order');
      }

      fetchInventory();
    } catch (err: any) {
      setError('Failed to update planned order. Please try again.');
    }
  };

  const handleRecordMovement = async (id: number, movement: { type: 'in' | 'out' | 'transfer' | 'adjustment'; quantity: number; reason: string }) => {
    try {
      const token = localStorage.getItem('authToken');
      const item = inventory.find(i => i.id === id);
      if (!item) return;

      const newMovement = {
        date: new Date().toISOString(),
        ...movement,
        employee: user?.email || 'Manager',
      };

      const updatedHistory = [...(item.movementHistory || []), newMovement];

      const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ movement_history: updatedHistory }),
      });

      if (!response.ok) {
        throw new Error('Failed to record movement');
      }

      // Update quantity if needed
      if (movement.type === 'in') {
        await handleUpdateQuantity(id, item.quantity_on_hand + movement.quantity);
      } else if (movement.type === 'out') {
        await handleUpdateQuantity(id, Math.max(0, item.quantity_on_hand - movement.quantity));
      }

      setSuccess('Movement recorded successfully!');
      fetchInventory();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError('Failed to record movement. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="inventory-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const lowStockItems = inventory.filter(item => item.isLowStock && item.quantity_on_hand > 0);
  const outOfStockItems = inventory.filter(item => item.quantity_on_hand === 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.totalValue || 0), 0);

  return (
    <div className="inventory-management">
      <div className="inventory-management-content">
        <header className="inventory-management-header">
          <div className="header-left">
            <h1>Inventory Management</h1>
            <p className="welcome-text">Comprehensive warehouse and inventory management system</p>
          </div>
          <div className="header-actions">
            <button 
              className="action-btn-secondary"
              onClick={() => navigate('/manager-dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Tabs */}
        <div className="inventory-tabs">
          <button 
            className={`tab-btn ${activeTab === 'planning' ? 'active' : ''}`}
            onClick={() => setActiveTab('planning')}
          >
            Inventory Planning
          </button>
          <button 
            className={`tab-btn ${activeTab === 'receiving' ? 'active' : ''}`}
            onClick={() => setActiveTab('receiving')}
          >
            Receiving & Inspection
          </button>
          <button 
            className={`tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            Storage Management
          </button>
          <button 
            className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            Inventory Monitoring
          </button>
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            New Orders
          </button>
          <button 
            className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            Warehouse Team
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports & Analysis
          </button>
          <button 
            className={`tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('safety')}
          >
            Safety & Quality
          </button>
        </div>

        {/* Inventory Planning Tab */}
        {activeTab === 'planning' && (
          <div className="planning-section">
            <div className="section-header-bar">
              <h2>Inventory Planning</h2>
              <button 
                className="add-plan-btn"
                onClick={() => setShowPlanningForm(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Plan
              </button>
            </div>

            {showPlanningForm && (
              <div className="form-container">
                <div className="form-header">
                  <h3>Create Inventory Plan</h3>
                  <button className="close-btn" onClick={() => setShowPlanningForm(false)}>×</button>
                </div>
                <form onSubmit={handlePlanningSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Item *</label>
                      <select
                        value={planningForm.itemId}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, itemId: e.target.value }))}
                        required
                      >
                        <option value="">Choose an item</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} (Current: {item.quantity_on_hand}, Reorder: {item.reorder_level})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Required Quantity *</label>
                      <input
                        type="number"
                        value={planningForm.requiredQuantity}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, requiredQuantity: e.target.value }))}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Planned Order Date *</label>
                      <input
                        type="date"
                        value={planningForm.plannedOrderDate}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, plannedOrderDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Expected Delivery Date *</label>
                      <input
                        type="date"
                        value={planningForm.expectedDeliveryDate}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Priority *</label>
                      <select
                        value={planningForm.priority}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                        required
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Reason *</label>
                      <input
                        type="text"
                        value={planningForm.reason}
                        onChange={(e) => setPlanningForm(prev => ({ ...prev, reason: e.target.value }))}
                        required
                        placeholder="e.g., Low stock, High demand"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowPlanningForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Create Plan
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="plans-grid">
              {inventoryPlans.map(plan => {
                const item = inventory.find(i => i.id === plan.itemId);
                return (
                  <div key={plan.id} className={`plan-card ${plan.priority}`}>
                    <div className="plan-header">
                      <h3>{plan.itemName}</h3>
                      <span className={`priority-badge ${plan.priority}`}>{plan.priority}</span>
                    </div>
                    <div className="plan-details">
                      <div className="detail-item">
                        <label>Required:</label>
                        <span>{plan.requiredQuantity} units</span>
                      </div>
                      <div className="detail-item">
                        <label>Current:</label>
                        <span>{plan.currentQuantity} units</span>
                      </div>
                      <div className="detail-item">
                        <label>Order Date:</label>
                        <span>{new Date(plan.plannedOrderDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <label>Expected Delivery:</label>
                        <span>{new Date(plan.expectedDeliveryDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <label>Status:</label>
                        <span className={`status-badge ${plan.status}`}>{plan.status}</span>
                      </div>
                      <div className="detail-item">
                        <label>Reason:</label>
                        <span>{plan.reason}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Receiving & Inspection Tab */}
        {activeTab === 'receiving' && (
          <div className="receiving-section">
            <div className="section-header-bar">
              <h2>Receiving & Quality Inspection</h2>
              <button 
                className="add-receiving-btn"
                onClick={() => setShowReceivingForm(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Record Receiving
              </button>
            </div>

            {showReceivingForm && (
              <div className="form-container">
                <div className="form-header">
                  <h3>Record Receiving & Inspection</h3>
                  <button className="close-btn" onClick={() => setShowReceivingForm(false)}>×</button>
                </div>
                <form onSubmit={handleReceivingSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Item *</label>
                      <select
                        value={receivingForm.itemId}
                        onChange={(e) => setReceivingForm(prev => ({ ...prev, itemId: e.target.value }))}
                        required
                      >
                        <option value="">Choose an item</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Received Quantity *</label>
                      <input
                        type="number"
                        value={receivingForm.receivedQuantity}
                        onChange={(e) => setReceivingForm(prev => ({ ...prev, receivedQuantity: e.target.value }))}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Received Date *</label>
                      <input
                        type="date"
                        value={receivingForm.receivedDate}
                        onChange={(e) => setReceivingForm(prev => ({ ...prev, receivedDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Received By *</label>
                      <input
                        type="text"
                        value={receivingForm.receivedBy}
                        onChange={(e) => setReceivingForm(prev => ({ ...prev, receivedBy: e.target.value }))}
                        required
                        placeholder="Employee name"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Supplier *</label>
                      <input
                        type="text"
                        value={receivingForm.supplier}
                        onChange={(e) => setReceivingForm(prev => ({ ...prev, supplier: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Invoice Number</label>
                      <input
                        type="text"
                        value={receivingForm.invoiceNumber}
                        onChange={(e) => setReceivingForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Quality Check *</label>
                    <div className="quality-check-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={receivingForm.qualityPassed}
                          onChange={(e) => setReceivingForm(prev => ({ ...prev, qualityPassed: e.target.checked }))}
                        />
                        Quality Passed
                      </label>
                    </div>
                    <textarea
                      value={receivingForm.qualityNotes}
                      onChange={(e) => setReceivingForm(prev => ({ ...prev, qualityNotes: e.target.value }))}
                      placeholder="Quality inspection notes..."
                      rows={3}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowReceivingForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Record Receiving
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="receiving-records-list">
              {receivingRecords.map(record => (
                <div key={record.id} className="receiving-record-card">
                  <div className="record-header">
                    <h3>{record.itemName}</h3>
                    <span className={`quality-status ${record.qualityCheck.passed ? 'passed' : 'failed'}`}>
                      {record.qualityCheck.passed ? '✅ Passed' : '❌ Failed'}
                    </span>
                  </div>
                  <div className="record-details">
                    <div className="detail-item">
                      <label>Quantity:</label>
                      <span>{record.receivedQuantity} units</span>
                    </div>
                    <div className="detail-item">
                      <label>Date:</label>
                      <span>{new Date(record.receivedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Received By:</label>
                      <span>{record.receivedBy}</span>
                    </div>
                    <div className="detail-item">
                      <label>Supplier:</label>
                      <span>{record.supplier}</span>
                    </div>
                    {record.invoiceNumber && (
                      <div className="detail-item">
                        <label>Invoice:</label>
                        <span>{record.invoiceNumber}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <label>Quality Notes:</label>
                      <span>{record.qualityCheck.notes || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Storage Management Tab */}
        {activeTab === 'storage' && (
          <div className="storage-section">
            <div className="section-header-bar">
              <h2>Warehouse Storage Management</h2>
            </div>
            <div className="storage-overview">
              <div className="storage-stat">
                <div className="stat-value">{new Set(inventory.map(i => i.warehouseLocation?.zone).filter(Boolean)).size}</div>
                <div className="stat-label">Zones</div>
              </div>
              <div className="storage-stat">
                <div className="stat-value">{new Set(inventory.map(i => i.warehouseLocation?.aisle).filter(Boolean)).size}</div>
                <div className="stat-label">Aisles</div>
              </div>
              <div className="storage-stat">
                <div className="stat-value">{inventory.length}</div>
                <div className="stat-label">Stored Items</div>
              </div>
            </div>
            <div className="storage-items-list">
              {inventory.map(item => (
                <div key={item.id} className="storage-item-card">
                  <div className="storage-item-header">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="storage-item-image" />
                    )}
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.sku}</p>
                    </div>
                  </div>
                  <div className="storage-location-inputs">
                    <div className="location-input-group">
                      <label>Zone (منطقة):</label>
                      <input
                        type="text"
                        value={item.warehouseLocation?.zone || ''}
                        onChange={(e) => handleUpdateWarehouseLocation(item.id, {
                          ...item.warehouseLocation,
                          zone: e.target.value,
                        })}
                        placeholder="e.g., A, B, C"
                        className="location-input"
                      />
                    </div>
                    <div className="location-input-group">
                      <label>Aisle (ممر):</label>
                      <input
                        type="text"
                        value={item.warehouseLocation?.aisle || ''}
                        onChange={(e) => handleUpdateWarehouseLocation(item.id, {
                          ...item.warehouseLocation,
                          aisle: e.target.value,
                        })}
                        placeholder="e.g., 1, 2, 3"
                        className="location-input"
                      />
                    </div>
                    <div className="location-input-group">
                      <label>Shelf (رف):</label>
                      <input
                        type="text"
                        value={item.warehouseLocation?.shelf || ''}
                        onChange={(e) => handleUpdateWarehouseLocation(item.id, {
                          ...item.warehouseLocation,
                          shelf: e.target.value,
                        })}
                        placeholder="e.g., 1, 2, 3"
                        className="location-input"
                      />
                    </div>
                    <div className="location-input-group">
                      <label>Bin (صندوق):</label>
                      <input
                        type="text"
                        value={item.warehouseLocation?.bin || ''}
                        onChange={(e) => handleUpdateWarehouseLocation(item.id, {
                          ...item.warehouseLocation,
                          bin: e.target.value,
                        })}
                        placeholder="e.g., 1, 2, 3"
                        className="location-input"
                      />
                    </div>
                  </div>
                  <div className="storage-location-display">
                    <span className="location-badge">
                      {item.warehouseLocation?.zone || '?'}-{item.warehouseLocation?.aisle || '?'}-{item.warehouseLocation?.shelf || '?'}-{item.warehouseLocation?.bin || '?'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="monitoring-section">
            <div className="section-header-bar">
              <h2>Inventory Movement Monitoring</h2>
            </div>
            <div className="monitoring-overview">
              <div className="monitoring-stat">
                <div className="stat-value">{inventory.reduce((sum, item) => sum + (item.movementHistory?.length || 0), 0)}</div>
                <div className="stat-label">Total Movements</div>
              </div>
              <div className="monitoring-stat">
                <div className="stat-value">
                  {inventory.reduce((sum, item) => sum + (item.movementHistory?.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0) || 0), 0)}
                </div>
                <div className="stat-label">Total In</div>
              </div>
              <div className="monitoring-stat">
                <div className="stat-value">
                  {inventory.reduce((sum, item) => sum + (item.movementHistory?.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0) || 0), 0)}
                </div>
                <div className="stat-label">Total Out</div>
              </div>
            </div>
            <div className="monitoring-items-list">
              {inventory.map(item => (
                <div key={item.id} className="monitoring-item-card">
                  <div className="monitoring-item-header">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="monitoring-item-image" />
                    )}
                    <div>
                      <h3>{item.name}</h3>
                      <p>Current Stock: {item.quantity_on_hand} units</p>
                    </div>
                  </div>
                  {item.movementHistory && item.movementHistory.length > 0 ? (
                    <div className="movement-history">
                      <h4>Movement History:</h4>
                      {item.movementHistory.slice(-5).map((movement, idx) => (
                        <div key={idx} className={`movement-item ${movement.type}`}>
                          <div className="movement-header">
                            <span className="movement-type">{movement.type.toUpperCase()}</span>
                            <span className="movement-date">{new Date(movement.date).toLocaleDateString()}</span>
                          </div>
                          <div className="movement-details">
                            <span>Quantity: {movement.quantity}</span>
                            <span>Reason: {movement.reason}</span>
                            <span>By: {movement.employee}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-movements">No movement history recorded</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Orders Tab */}
        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header-bar">
              <h2>New Inventory Orders</h2>
              <button 
                className="add-order-btn"
                onClick={() => setShowOrderForm(true)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Order
              </button>
            </div>

            {showOrderForm && (
              <div className="form-container">
                <div className="form-header">
                  <h3>Create New Order</h3>
                  <button className="close-btn" onClick={() => setShowOrderForm(false)}>×</button>
                </div>
                <form onSubmit={handleOrderSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Item *</label>
                      <select
                        value={orderForm.itemId}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, itemId: e.target.value }))}
                        required
                      >
                        <option value="">Choose an item</option>
                        {inventory.filter(item => item.isLowStock || item.quantity_on_hand === 0).map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} (Current: {item.quantity_on_hand}, Reorder: {item.reorder_level})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        value={orderForm.quantity}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Expected Delivery Date *</label>
                      <input
                        type="date"
                        value={orderForm.expectedDate}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, expectedDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Supplier *</label>
                      <input
                        type="text"
                        value={orderForm.supplier}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, supplier: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Priority *</label>
                    <select
                      value={orderForm.priority}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                      required
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowOrderForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Create Order
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="orders-list">
              {inventory
                .filter(item => item.plannedOrder)
                .map(item => (
                  <div key={item.id} className="order-card">
                    <div className="order-header">
                      <h3>{item.name}</h3>
                      <span className={`order-status ${item.plannedOrder?.status}`}>
                        {item.plannedOrder?.status}
                      </span>
                    </div>
                    <div className="order-details">
                      <div className="detail-item">
                        <label>Order Quantity:</label>
                        <span>{item.plannedOrder?.quantity} units</span>
                      </div>
                      <div className="detail-item">
                        <label>Expected Date:</label>
                        <span>{item.plannedOrder?.expectedDate ? new Date(item.plannedOrder.expectedDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      {item.supplier && (
                        <>
                          <div className="detail-item">
                            <label>Supplier:</label>
                            <span>{item.supplier.name}</span>
                          </div>
                          <div className="detail-item">
                            <label>Lead Time:</label>
                            <span>{item.supplier.leadTime} days</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Warehouse Team Tab */}
        {activeTab === 'team' && (
          <div className="team-section">
            <div className="section-header-bar">
              <h2>Warehouse Team Management</h2>
            </div>
            <div className="team-overview">
              <div className="team-stat">
                <div className="stat-value">{warehouseTeam.length}</div>
                <div className="stat-label">Team Members</div>
              </div>
              <div className="team-stat">
                <div className="stat-value">
                  {new Set(warehouseTeam.map(m => m.shift)).size}
                </div>
                <div className="stat-label">Active Shifts</div>
              </div>
            </div>
            <div className="team-grid">
              {warehouseTeam.map(member => (
                <div key={member.id} className="team-member-card">
                  <div className="member-header">
                    <h3>{member.name}</h3>
                    <span className="member-role">{member.role}</span>
                  </div>
                  <div className="member-details">
                    <div className="detail-item">
                      <label>Shift:</label>
                      <span>{member.shift}</span>
                    </div>
                    <div className="detail-item">
                      <label>Assigned Tasks:</label>
                      <div className="tasks-list">
                        {member.assignedTasks.map((task, idx) => (
                          <span key={idx} className="task-badge">{task}</span>
                        ))}
                      </div>
                    </div>
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
              <h2>Comprehensive Reports & Analysis</h2>
            </div>

            {/* Report Sub-Tabs */}
            <div className="report-sub-tabs">
              <button 
                className={`report-sub-tab ${reportSubTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setReportSubTab('inventory')}
              >
                Inventory Management
              </button>
              <button 
                className={`report-sub-tab ${reportSubTab === 'orders' ? 'active' : ''}`}
                onClick={() => setReportSubTab('orders')}
              >
                Order Management
              </button>
              <button 
                className={`report-sub-tab ${reportSubTab === 'employees' ? 'active' : ''}`}
                onClick={() => setReportSubTab('employees')}
              >
                Employee Management
              </button>
              <button 
                className={`report-sub-tab ${reportSubTab === 'plants' ? 'active' : ''}`}
                onClick={() => setReportSubTab('plants')}
              >
                Plant Management
              </button>
            </div>

            {/* Inventory Management Reports */}
            {reportSubTab === 'inventory' && (
              <div className="report-content">
                <div className="report-subsection">
                  <h3>Product Status</h3>
                  <div className="status-grid">
                    <div className="status-card available">
                      <div className="status-icon">✅</div>
                      <div className="status-info">
                        <div className="status-label">Available</div>
                        <div className="status-value">{inventory.filter(i => i.quantity_on_hand > i.reorder_level).length}</div>
                      </div>
                    </div>
                    <div className="status-card low">
                      <div className="status-icon">⚠️</div>
                      <div className="status-info">
                        <div className="status-label">Low Stock</div>
                        <div className="status-value">{lowStockItems.length}</div>
                      </div>
                    </div>
                    <div className="status-card out">
                      <div className="status-icon">❌</div>
                      <div className="status-info">
                        <div className="status-label">Out of Stock</div>
                        <div className="status-value">{outOfStockItems.length}</div>
                      </div>
                    </div>
                    <div className="status-card excess">
                      <div className="status-icon">📦</div>
                      <div className="status-info">
                        <div className="status-label">Excess Stock</div>
                        <div className="status-value">
                          {inventory.filter(i => i.quantity_on_hand > (i.reorder_level * 3)).length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Inventory Movement</h3>
                  <div className="movement-report">
                    <div className="movement-summary">
                      <div className="movement-stat">
                        <label>Total Movements:</label>
                        <span>{inventory.reduce((sum, item) => sum + (item.movementHistory?.length || 0), 0)}</span>
                      </div>
                      <div className="movement-stat">
                        <label>Items In:</label>
                        <span className="in">
                          {inventory.reduce((sum, item) => sum + (item.movementHistory?.filter(m => m.type === 'in').reduce((s, m) => s + m.quantity, 0) || 0), 0)}
                        </span>
                      </div>
                      <div className="movement-stat">
                        <label>Items Out:</label>
                        <span className="out">
                          {inventory.reduce((sum, item) => sum + (item.movementHistory?.filter(m => m.type === 'out').reduce((s, m) => s + m.quantity, 0) || 0), 0)}
                        </span>
                      </div>
                    </div>
                    <div className="movement-details-list">
                      <h4>Most Used Items:</h4>
                      {inventory
                        .filter(item => item.movementHistory && item.movementHistory.length > 0)
                        .sort((a, b) => (b.movementHistory?.length || 0) - (a.movementHistory?.length || 0))
                        .slice(0, 5)
                        .map(item => (
                          <div key={item.id} className="movement-item-row">
                            <span className="item-name">{item.name}</span>
                            <span className="movement-count">{item.movementHistory?.length || 0} movements</span>
                          </div>
                        ))}
                    </div>
                    <div className="movement-by-employee">
                      <h4>Movement by Employee:</h4>
                      {Array.from(new Set(
                        inventory.flatMap(item => 
                          item.movementHistory?.map(m => m.employee) || []
                        )
                      )).map(employee => {
                        const movements = inventory.flatMap(item => 
                          item.movementHistory?.filter(m => m.employee === employee) || []
                        );
                        return (
                          <div key={employee} className="employee-movement">
                            <span className="employee-name">{employee}</span>
                            <span className="movement-count">{movements.length} movements</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Purchase Orders</h3>
                  <div className="purchase-orders-report">
                    <div className="order-status-grid">
                      <div className="order-status-card new">
                        <div className="order-status-label">New Orders</div>
                        <div className="order-status-value">
                          {inventoryPlans.filter(p => p.status === 'planned').length}
                        </div>
                      </div>
                      <div className="order-status-card completed">
                        <div className="order-status-label">Completed</div>
                        <div className="order-status-value">
                          {inventoryPlans.filter(p => p.status === 'received').length}
                        </div>
                      </div>
                      <div className="order-status-card delayed">
                        <div className="order-status-label">Delayed</div>
                        <div className="order-status-value">
                          {inventoryPlans.filter(p => {
                            const expectedDate = new Date(p.expectedDeliveryDate);
                            return expectedDate < new Date() && p.status !== 'received';
                          }).length}
                        </div>
                      </div>
                    </div>
                    <div className="orders-list-detailed">
                      {inventoryPlans.map(plan => {
                        const isDelayed = new Date(plan.expectedDeliveryDate) < new Date() && plan.status !== 'received';
                        return (
                          <div key={plan.id} className={`order-row ${isDelayed ? 'delayed' : ''}`}>
                            <div className="order-info">
                              <span className="order-item">{plan.itemName}</span>
                              <span className="order-quantity">{plan.requiredQuantity} units</span>
                            </div>
                            <div className="order-meta">
                              <span className={`order-status-badge ${plan.status}`}>{plan.status}</span>
                              <span className="order-date">
                                Expected: {new Date(plan.expectedDeliveryDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Costs Analysis</h3>
                  <div className="costs-report">
                    <div className="cost-summary">
                      <div className="cost-item-total">
                        <label>Total Purchase Cost:</label>
                        <span>₪{inventory.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity_on_hand), 0).toLocaleString()}</span>
                      </div>
                      <div className="cost-item-total">
                        <label>Storage Cost (Estimated):</label>
                        <span>₪{(inventory.length * 50).toLocaleString()}</span>
                      </div>
                      <div className="cost-item-total">
                        <label>Waste Cost:</label>
                        <span>₪{inventory.filter(i => i.qualityStatus === 'damaged' || i.qualityStatus === 'poor').reduce((sum, item) => sum + ((item.cost || 0) * item.quantity_on_hand * 0.1), 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="top-cost-items">
                      <h4>Top Cost Items:</h4>
                      {inventory
                        .filter(item => item.cost && item.cost > 0)
                        .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
                        .slice(0, 5)
                        .map(item => (
                          <div key={item.id} className="cost-item-row">
                            <span className="item-name">{item.name}</span>
                            <span className="item-cost">₪{(item.totalValue || 0).toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Management Reports */}
            {reportSubTab === 'orders' && (
              <div className="report-content">
                <div className="report-subsection">
                  <h3>Order Status Overview</h3>
                  <div className="order-status-overview">
                    <div className="order-stat-card new">
                      <div className="order-stat-label">New Orders</div>
                      <div className="order-stat-value">{orders.filter(o => o.status === 'pending').length}</div>
                    </div>
                    <div className="order-stat-card completed">
                      <div className="order-stat-label">Completed</div>
                      <div className="order-stat-value">{orders.filter(o => o.status === 'delivered').length}</div>
                    </div>
                    <div className="order-stat-card cancelled">
                      <div className="order-stat-label">Cancelled</div>
                      <div className="order-stat-value">{orders.filter(o => o.status === 'cancelled').length}</div>
                    </div>
                    <div className="order-stat-card delayed">
                      <div className="order-stat-label">Delayed</div>
                      <div className="order-stat-value">
                        {orders.filter(o => o.delay_reason || (o.status !== 'delivered' && o.status !== 'cancelled' && new Date(o.placed_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))).length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Top Customers</h3>
                  <div className="top-customers-list">
                    {Array.from(new Set(orders.map(o => o.customer?.user?.full_name || o.customer?.user?.email).filter(Boolean)))
                      .map(customerName => {
                        const customerOrders = orders.filter(o => 
                          (o.customer?.user?.full_name === customerName || o.customer?.user?.email === customerName)
                        );
                        return {
                          name: customerName,
                          orderCount: customerOrders.length,
                          totalSpent: customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                        };
                      })
                      .sort((a, b) => b.orderCount - a.orderCount)
                      .slice(0, 5)
                      .map((customer, idx) => (
                        <div key={idx} className="customer-row">
                          <div className="customer-info">
                            <span className="customer-rank">#{idx + 1}</span>
                            <span className="customer-name">{customer.name}</span>
                          </div>
                          <div className="customer-stats">
                            <span className="customer-orders">{customer.orderCount} orders</span>
                            <span className="customer-total">₪{customer.totalSpent.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Top Selling Products</h3>
                  <div className="top-products-list">
                    {Array.from(new Set(
                      orders.flatMap(o => 
                        o.order_items?.map((item: any) => item.inventory_item?.name || item.inventory_item?.plant?.name).filter(Boolean) || []
                      )
                    )).map(productName => {
                      const productOrders = orders.flatMap(o => 
                        o.order_items?.filter((item: any) => 
                          (item.inventory_item?.name === productName || item.inventory_item?.plant?.name === productName)
                        ) || []
                      );
                      const totalQuantity = productOrders.reduce((sum, item) => sum + (item.quantity || 0), 0);
                      const totalRevenue = productOrders.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
                      return {
                        name: productName,
                        quantity: totalQuantity,
                        revenue: totalRevenue,
                      };
                    })
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 5)
                    .map((product, idx) => (
                      <div key={idx} className="product-row">
                        <div className="product-info">
                          <span className="product-rank">#{idx + 1}</span>
                          <span className="product-name">{product.name}</span>
                        </div>
                        <div className="product-stats">
                          <span className="product-quantity">{product.quantity} sold</span>
                          <span className="product-revenue">₪{product.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Employee Management Reports */}
            {reportSubTab === 'employees' && (
              <div className="report-content">
                <div className="report-subsection">
                  <h3>Attendance & Absence</h3>
                  <div className="attendance-overview">
                    <div className="attendance-stat">
                      <div className="attendance-label">Total Employees</div>
                      <div className="attendance-value">{employees.length}</div>
                    </div>
                    <div className="attendance-stat">
                      <div className="attendance-label">Total Absences</div>
                      <div className="attendance-value">
                        {employees.reduce((sum, emp) => sum + (emp.attendance?.totalAbsences || 0), 0)}
                      </div>
                    </div>
                    <div className="attendance-stat">
                      <div className="attendance-label">Total Leaves</div>
                      <div className="attendance-value">
                        {employees.reduce((sum, emp) => sum + (emp.attendance?.totalLeaves || 0), 0)}
                      </div>
                    </div>
                    <div className="attendance-stat">
                      <div className="attendance-label">Total Lates</div>
                      <div className="attendance-value">
                        {employees.reduce((sum, emp) => sum + (emp.attendance?.totalLates || 0), 0)}
                      </div>
                    </div>
                  </div>
                  <div className="attendance-details">
                    {employees.map(emp => (
                      <div key={emp.id} className="employee-attendance-card">
                        <div className="employee-name">{emp.full_name}</div>
                        <div className="attendance-breakdown">
                          <span>Absences: {emp.attendance?.totalAbsences || 0}</span>
                          <span>Leaves: {emp.attendance?.totalLeaves || 0}</span>
                          <span>Lates: {emp.attendance?.totalLates || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Employee Performance</h3>
                  <div className="performance-report">
                    {employees.map(emp => (
                      <div key={emp.id} className="employee-performance-card">
                        <div className="performance-header">
                          <h4>{emp.full_name}</h4>
                          <span className={`performance-rating ${emp.performance?.rating || 'average'}`}>
                            {emp.performance?.rating || 'Not Rated'}
                          </span>
                        </div>
                        <div className="performance-metrics">
                          <div className="metric">
                            <label>Tasks Completed:</label>
                            <span>{emp.performance?.tasksCompleted || 0}</span>
                          </div>
                          <div className="metric">
                            <label>On Time:</label>
                            <span className="success">{emp.performance?.tasksOnTime || 0}</span>
                          </div>
                          <div className="metric">
                            <label>Delayed:</label>
                            <span className="warning">{emp.performance?.tasksDelayed || 0}</span>
                          </div>
                        </div>
                        {emp.performance?.notes && emp.performance.notes.length > 0 && (
                          <div className="performance-notes">
                            <h5>Issues Faced:</h5>
                            {emp.performance.notes.map((note: string, idx: number) => (
                              <div key={idx} className="note-item">{note}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Work Distribution</h3>
                  <div className="work-distribution">
                    {Array.from(new Set(
                      employees.flatMap(emp => 
                        Object.keys(emp.assignedTasks || {})
                      )
                    )).map(task => {
                      const assignedEmployees = employees.filter(emp => 
                        emp.assignedTasks && Object.keys(emp.assignedTasks).includes(task)
                      );
                      return (
                        <div key={task} className="task-distribution-card">
                          <div className="task-name">{task}</div>
                          <div className="task-employees">
                            {assignedEmployees.map(emp => (
                              <span key={emp.id} className="employee-badge">{emp.full_name}</span>
                            ))}
                          </div>
                          <div className="task-count">{assignedEmployees.length} employees</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Plant Management Reports */}
            {reportSubTab === 'plants' && (
              <div className="report-content">
                <div className="report-subsection">
                  <h3>Plant Growth Status</h3>
                  <div className="growth-status-grid">
                    <div className="growth-status-card ready">
                      <div className="growth-status-label">Ready for Sale</div>
                      <div className="growth-status-value">
                        {plants.filter(p => p.growthStage === 'ready_for_sale' || p.inventoryStatus === 'in_inventory').length}
                      </div>
                    </div>
                    <div className="growth-status-card needs-care">
                      <div className="growth-status-label">Needs Care</div>
                      <div className="growth-status-value">
                        {plants.filter(p => p.healthStatus === 'diseased' || p.healthStatus === 'pest_infested' || p.healthStatus === 'damaged').length}
                      </div>
                    </div>
                    <div className="growth-status-card growing">
                      <div className="growth-status-label">Growing</div>
                      <div className="growth-status-value">
                        {plants.filter(p => p.growthStage === 'seed' || p.growthStage === 'seedling').length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Watering & Fertilization Schedule</h3>
                  <div className="schedule-report">
                    {plants
                      .filter(p => p.wateringSchedule || p.fertilizationSchedule)
                      .map(plant => (
                        <div key={plant.id} className="schedule-card">
                          <div className="schedule-plant-name">{plant.name}</div>
                          {plant.wateringSchedule && (
                            <div className="schedule-item">
                              <span className="schedule-type">💧 Watering:</span>
                              <span className="schedule-info">
                                Every {plant.wateringSchedule.frequency} days
                                {plant.wateringSchedule.nextWatering && (
                                  <> | Next: {new Date(plant.wateringSchedule.nextWatering).toLocaleDateString()}</>
                                )}
                              </span>
                            </div>
                          )}
                          {plant.fertilizationSchedule && (
                            <div className="schedule-item">
                              <span className="schedule-type">🌿 Fertilization:</span>
                              <span className="schedule-info">
                                Every {plant.fertilizationSchedule.frequency} days
                                {plant.fertilizationSchedule.nextFertilization && (
                                  <> | Next: {new Date(plant.fertilizationSchedule.nextFertilization).toLocaleDateString()}</>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Most Requested Plants</h3>
                  <div className="requested-plants-list">
                    {Array.from(new Set(
                      orders.flatMap(o => 
                        o.order_items?.map((item: any) => item.inventory_item?.plant?.name || item.inventory_item?.name).filter(Boolean) || []
                      )
                    )).map(plantName => {
                      const plantOrders = orders.flatMap(o => 
                        o.order_items?.filter((item: any) => 
                          (item.inventory_item?.plant?.name === plantName || item.inventory_item?.name === plantName)
                        ) || []
                      );
                      const totalQuantity = plantOrders.reduce((sum, item) => sum + (item.quantity || 0), 0);
                      return {
                        name: plantName,
                        quantity: totalQuantity,
                      };
                    })
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 5)
                    .map((plant, idx) => (
                      <div key={idx} className="requested-plant-row">
                        <span className="plant-rank">#{idx + 1}</span>
                        <span className="plant-name">{plant.name}</span>
                        <span className="plant-requests">{plant.quantity} orders</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="report-subsection">
                  <h3>Most Damaged Plants</h3>
                  <div className="damaged-plants-list">
                    {plants
                      .filter(p => p.healthStatus === 'damaged' || p.healthStatus === 'diseased' || p.healthStatus === 'pest_infested')
                      .sort((a, b) => (b.healthIssues?.length || 0) - (a.healthIssues?.length || 0))
                      .slice(0, 5)
                      .map(plant => (
                        <div key={plant.id} className="damaged-plant-row">
                          <div className="plant-info">
                            <span className="plant-name">{plant.name}</span>
                            <span className={`health-status ${plant.healthStatus}`}>{plant.healthStatus}</span>
                          </div>
                          <div className="plant-issues">
                            {plant.healthIssues?.length || 0} issues
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Safety & Quality Tab */}
        {activeTab === 'safety' && (
          <div className="safety-section">
            <div className="section-header-bar">
              <h2>Safety & Quality Management</h2>
            </div>
            <div className="safety-overview">
              <div className="safety-stat excellent">
                <div className="stat-value">{inventory.filter(i => i.qualityStatus === 'excellent').length}</div>
                <div className="stat-label">Excellent</div>
              </div>
              <div className="safety-stat good">
                <div className="stat-value">{inventory.filter(i => i.qualityStatus === 'good').length}</div>
                <div className="stat-label">Good</div>
              </div>
              <div className="safety-stat fair">
                <div className="stat-value">{inventory.filter(i => i.qualityStatus === 'fair').length}</div>
                <div className="stat-label">Fair</div>
              </div>
              <div className="safety-stat poor">
                <div className="stat-value">{inventory.filter(i => i.qualityStatus === 'poor' || i.qualityStatus === 'damaged').length}</div>
                <div className="stat-label">Poor/Damaged</div>
              </div>
            </div>
            <div className="safety-items-list">
              {inventory.map(item => (
                <div key={item.id} className="safety-item-card">
                  <div className="safety-item-header">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="safety-item-image" />
                    )}
                    <div>
                      <h3>{item.name}</h3>
                      <span className={`quality-status-badge ${item.qualityStatus}`}>
                        {item.qualityStatus}
                      </span>
                    </div>
                  </div>
                  <div className="safety-details">
                    {item.safetyCompliance && (
                      <>
                        {item.safetyCompliance.temperature && (
                          <div className="safety-item">
                            <label>Temperature:</label>
                            <span>{item.safetyCompliance.temperature}°C</span>
                          </div>
                        )}
                        {item.safetyCompliance.humidity && (
                          <div className="safety-item">
                            <label>Humidity:</label>
                            <span>{item.safetyCompliance.humidity}%</span>
                          </div>
                        )}
                        {item.safetyCompliance.lastInspection && (
                          <div className="safety-item">
                            <label>Last Inspection:</label>
                            <span>{new Date(item.safetyCompliance.lastInspection).toLocaleDateString()}</span>
                          </div>
                        )}
                        {item.safetyCompliance.issues && item.safetyCompliance.issues.length > 0 && (
                          <div className="safety-issues">
                            <label>Issues:</label>
                            {item.safetyCompliance.issues.map((issue, idx) => (
                              <span key={idx} className="issue-badge">{issue}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {item.qualityCheck && (
                      <div className="quality-check-info">
                        <div className="quality-item">
                          <label>Last Check:</label>
                          <span>{new Date(item.qualityCheck.date).toLocaleDateString()}</span>
                        </div>
                        <div className="quality-item">
                          <label>Checked By:</label>
                          <span>{item.qualityCheck.checkedBy}</span>
                        </div>
                        <div className="quality-item">
                          <label>Status:</label>
                          <span className={item.qualityCheck.passed ? 'passed' : 'failed'}>
                            {item.qualityCheck.passed ? '✅ Passed' : '❌ Failed'}
                          </span>
                        </div>
                        {item.qualityCheck.notes && (
                          <div className="quality-item">
                            <label>Notes:</label>
                            <span>{item.qualityCheck.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

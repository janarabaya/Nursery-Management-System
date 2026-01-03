import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireRole } from '../utils/useAuth';
import { API_BASE_URL } from '../config/api';
import './OrderManagement.css';

interface OrderItem {
  id: number;
  inventory_item_id: number;
  quantity: number;
  unit_price: number;
  inventory_item?: {
    id: number;
    name: string;
    quantity_on_hand?: number;
    plant?: {
      id: number;
      name: string;
      image_url?: string;
      description?: string;
    };
  };
}

interface Order {
  id: number;
  customer_id?: string;
  status: 'pending' | 'approved' | 'preparing' | 'delivered' | 'controlled' | 'cancelled';
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  delivery_address?: string;
  notes?: string;
  complaint?: string;
  placed_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  customer?: {
    user?: {
      full_name: string;
      email?: string;
      phone?: string;
    };
  };
  is_large_order?: boolean;
  delay_reason?: string;
}

interface InventoryItem {
  id: number;
  plant_id: number;
  quantity_on_hand: number;
  reorder_level: number;
  plant?: {
    id: number;
    name: string;
    image_url?: string;
  };
}

interface ReportData {
  mostOrderedProducts: Array<{ name: string; count: number; totalQuantity: number }>;
  peakTimes: Array<{ hour: number; orderCount: number }>;
  cancelledOrders: Array<{ id: number; reason: string; date: string }>;
}

interface FinancialReport {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  topRevenueProducts: Array<{ name: string; revenue: number; quantity: number }>;
  paymentMethods: Array<{ method: string; count: number; total: number }>;
  trends?: {
    revenueChange: number;
    expensesChange: number;
    profitChange: number;
    marginChange: number;
  };
}

interface EmployeePerformanceReport {
  employees: Array<{
    id: number;
    name: string;
    role: string;
    ordersProcessed: number;
    averageProcessingTime: number;
    customerSatisfaction: number;
    efficiency: number;
    trends?: {
      ordersChange: number;
      timeChange: number;
      satisfactionChange: number;
      efficiencyChange: number;
    };
  }>;
  topPerformers: Array<{ name: string; metric: string; value: number }>;
}

interface SalesReport {
  totalSales: number;
  salesByPeriod: Array<{ period: string; sales: number; orders: number }>;
  salesByCategory: Array<{ category: string; sales: number; percentage: number }>;
  salesTrend: Array<{ date: string; sales: number }>;
  averageOrderValue: number;
  conversionRate: number;
  trends?: {
    salesChange: number;
    orderValueChange: number;
    conversionChange: number;
  };
}

interface OtherReports {
  inventoryStatus: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
  };
  customerAnalytics: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageOrdersPerCustomer: number;
  };
  deliveryPerformance: {
    onTimeDeliveries: number;
    delayedDeliveries: number;
    averageDeliveryTime: number;
    deliverySuccessRate: number;
  };
}

export function OrderManagement() {
  const { user, isLoading, hasAccess } = useRequireRole('manager');
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'orders' | 'large-orders' | 'problems'>('orders');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [problemOrders, setProblemOrders] = useState<Order[]>([]);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [websiteVisitors, setWebsiteVisitors] = useState<number>(0);
  const [minOrderAmountForApproval, setMinOrderAmountForApproval] = useState<number>(() => {
    const saved = localStorage.getItem('minOrderAmountForApproval');
    return saved ? parseInt(saved, 10) : 3000;
  });
  const [showEditThreshold, setShowEditThreshold] = useState(false);
  const [newThreshold, setNewThreshold] = useState<string>('');
  const [showApprovalAlert, setShowApprovalAlert] = useState(false);
  const [showRejectAlert, setShowRejectAlert] = useState(false);
  const [showPostponeAlert, setShowPostponeAlert] = useState(false);
  const [showCompensationAlert, setShowCompensationAlert] = useState(false);
  const [compensationMessage, setCompensationMessage] = useState<string>('');
  const [alertCompensationType, setAlertCompensationType] = useState<'discount' | 'gift'>('discount');
  
  // Compensation modal state
  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [compensationOrderId, setCompensationOrderId] = useState<number | null>(null);
  const [compensationType, setCompensationType] = useState<'discount' | 'gift'>('discount');
  const [discountPercentage, setDiscountPercentage] = useState<string>('25');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [giftQuantity, setGiftQuantity] = useState<string>('1');
  const [availablePlants, setAvailablePlants] = useState<any[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(false);
  
  // Postpone modal state
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeOrderId, setPostponeOrderId] = useState<number | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState<string>('');

  useEffect(() => {
    if (!isLoading && hasAccess) {
      fetchAllOrders();
      fetchInventory();
      fetchEmployeesCount();
      fetchWebsiteVisitors();
      fetchAvailablePlants();
    }
  }, [isLoading, hasAccess]);

  // Debug: Monitor modal states
  useEffect(() => {
    console.log('🔍 Compensation modal state changed:', showCompensationModal);
  }, [showCompensationModal]);

  useEffect(() => {
    console.log('🔍 Postpone modal state changed:', showPostponeModal);
  }, [showPostponeModal]);

  useEffect(() => {
    if (!Array.isArray(orders)) return;
    
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [statusFilter, orders]);

  useEffect(() => {
    if (!Array.isArray(orders)) return;
    
    // Filter problem orders: complaints, delays, out of stock
    const problems = orders.filter(order => 
      order.complaint || 
      order.delay_reason || 
      order.status === 'cancelled' ||
      (order.order_items && order.order_items.some(item => 
        (item.inventory_item?.quantity_on_hand || 0) < item.quantity
      ))
    );
    setProblemOrders(problems);
  }, [orders]);

  const fetchAllOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Handle both formats: {success: true, data: [...]} or direct array
        const ordersData = result.data || result || [];
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setFilteredOrders(Array.isArray(ordersData) ? ordersData : []);
      } else {
        // Mock data for demo
        const mockOrders: Order[] = [
          {
            id: 1,
            status: 'pending',
            total_amount: 5000,
            placed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_large_order: true,
            order_items: [
              {
                id: 1,
                inventory_item_id: 1,
                quantity: 10,
                unit_price: 500,
                inventory_item: {
                  id: 1,
                  name: 'Tomato Seedling',
                  quantity_on_hand: 15,
                  plant: {
                    id: 1,
                    name: 'Tomato Seedling',
                    image_url: 'https://www.yates.com.au/media/plants/vegetable/pr-tn-vege-tomato-2.jpg',
                  },
                },
              },
            ],
            customer: {
              user: {
                full_name: 'Ahmed Ali',
                email: 'ahmed@example.com',
                phone: '+970 59 123 4567',
              },
            },
            delivery_address: 'Ramallah, Al-Bireh',
            payment_method: 'Cash on Delivery',
            payment_status: 'pending',
          },
          {
            id: 2,
            status: 'approved',
            total_amount: 1200,
            placed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            order_items: [
              {
                id: 2,
                inventory_item_id: 2,
                quantity: 5,
                unit_price: 240,
                inventory_item: {
                  id: 2,
                  name: 'Olive Seedling',
                  quantity_on_hand: 8,
                  plant: {
                    id: 2,
                    name: 'Olive Seedling',
                    image_url: 'https://cdn.pixabay.com/photo/2022/09/29/09/35/olive-7486982_1280.jpg',
                  },
                },
              },
            ],
            customer: {
              user: {
                full_name: 'Sara Mohammed',
                email: 'sara@example.com',
                phone: '+970 59 987 6543',
              },
            },
            delivery_address: 'Nablus, Old City',
            payment_method: 'Credit Card',
            payment_status: 'paid',
          },
          {
            id: 3,
            status: 'preparing',
            total_amount: 800,
            placed_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            order_items: [
              {
                id: 3,
                inventory_item_id: 3,
                quantity: 3,
                unit_price: 267,
                inventory_item: {
                  id: 3,
                  name: 'Strawberry Seedling',
                  quantity_on_hand: 0,
                  plant: {
                    id: 3,
                    name: 'Strawberry Seedling',
                    image_url: 'https://th.bing.com/th/id/OIP.7KZqxNgIMhm6DuwOGeza2gHaHa?w=187&h=187&c=7&r=0&o=7&cb=ucfimg2&dpr=1.3&pid=1.7&rm=3&ucfimg=1',
                  },
                },
              },
            ],
            customer: {
              user: {
                full_name: 'Omar Hassan',
                email: 'omar@example.com',
                phone: '+970 59 555 1234',
              },
            },
            delivery_address: 'Jerusalem, Beit Hanina',
            payment_method: 'Cash on Delivery',
            payment_status: 'pending',
            complaint: 'Order delayed for 3 days',
          },
        ];
        setOrders(mockOrders);
        setFilteredOrders(mockOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders. Please try again.');
    } finally {
      setIsLoadingOrders(false);
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
        const result = await response.json();
        // Handle both formats: {success: true, data: [...]} or direct array
        const inventoryData = result.data || result || [];
        setInventory(Array.isArray(inventoryData) ? inventoryData : []);
      } else {
        // Mock inventory data
        setInventory([
          { id: 1, plant_id: 1, quantity_on_hand: 15, reorder_level: 10, plant: { id: 1, name: 'Tomato Seedling' } },
          { id: 2, plant_id: 2, quantity_on_hand: 8, reorder_level: 5, plant: { id: 2, name: 'Olive Seedling' } },
          { id: 3, plant_id: 3, quantity_on_hand: 0, reorder_level: 10, plant: { id: 3, name: 'Strawberry Seedling' } },
        ]);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };


  const fetchEmployeesCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/employees/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTotalEmployees(data.count || 0);
      } else {
        // Default mock count
        setTotalEmployees(12);
      }
    } catch (error) {
      console.error('Error fetching employees count:', error);
      // Fallback to mock data
      setTotalEmployees(12);
    }
  };

  const fetchAvailablePlants = async () => {
    setIsLoadingPlants(true);
    try {
      const response = await fetch(`${API_BASE_URL}/plants`);
      if (response.ok) {
        const result = await response.json();
        console.log('🌱 Plants API response:', result);
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          console.log('✅ Setting available plants:', result.data.length, 'plants');
          // Filter out any invalid plants and ensure we have the required fields
          const validPlants = result.data.filter((plant: any) => 
            (plant.PlantID || plant.id || plant.ID) && 
            (plant.PlantName || plant.name || plant.Name)
          );
          setAvailablePlants(validPlants);
          console.log('✅ Valid plants:', validPlants.length);
        } else {
          console.warn('⚠️ Plants data is not an array or is empty:', result);
          setAvailablePlants([]);
        }
      } else {
        console.error('❌ Failed to fetch plants:', response.status, response.statusText);
        setAvailablePlants([]);
      }
    } catch (error) {
      console.error('❌ Error fetching plants:', error);
      setAvailablePlants([]);
    } finally {
      setIsLoadingPlants(false);
    }
  };

  const fetchWebsiteVisitors = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/analytics/visitors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setWebsiteVisitors(result.visitors || result.totalVisitors || result.count || 0);
      } else {
        // Mock data - simulate website visitors
        const mockVisitors = Math.floor(Math.random() * 5000) + 10000; // Random between 10000-15000
        setWebsiteVisitors(mockVisitors);
      }
    } catch (error) {
      console.error('Error fetching website visitors:', error);
      // Fallback to mock data
      const mockVisitors = Math.floor(Math.random() * 5000) + 10000;
      setWebsiteVisitors(mockVisitors);
    }
  };


  const fetchOrderDetails = async (orderId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Handle both formats: {success: true, data: {...}} or direct object
        const orderData = result.data || result;
        setSelectedOrder(orderData);
      } else {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          setSelectedOrder(order);
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setSelectedOrder(order);
      }
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setProcessingOrderId(orderId);
    setError('');
    setSuccess('');

    try {
      // Check inventory availability before approving
      if (newStatus === 'approved') {
        const order = orders.find(o => o.id === orderId);
        if (order?.order_items) {
          for (const item of order.order_items) {
            const invItem = inventory.find(inv => inv.id === item.inventory_item_id);
            if (!invItem || invItem.quantity_on_hand < item.quantity) {
              setError(`Insufficient stock for ${item.inventory_item?.plant?.name || item.inventory_item?.name}. Available: ${invItem?.quantity_on_hand || 0}, Required: ${item.quantity}`);
              setProcessingOrderId(null);
              return;
            }
          }
        }
      }

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update order status to ${newStatus}`);
      }

      // Update inventory if approved
      if (newStatus === 'approved') {
        const order = orders.find(o => o.id === orderId);
        if (order?.order_items) {
          for (const item of order.order_items) {
            const invItem = inventory.find(inv => inv.id === item.inventory_item_id);
            if (invItem) {
              // Reserve inventory (in real app, this would be done via API)
              invItem.quantity_on_hand -= item.quantity;
            }
          }
        }
        // Show alert for 3 seconds
        setSuccess('Order approved successfully!');
        setShowApprovalAlert(true);
        setTimeout(() => {
          setShowApprovalAlert(false);
        }, 3000);
      } else if (newStatus === 'cancelled') {
        // Show reject alert for 3 seconds
        setSuccess('Order rejected successfully!');
        setShowRejectAlert(true);
        setTimeout(() => {
          setShowRejectAlert(false);
        }, 3000);
      } else {
        setSuccess(`Order status updated to ${newStatus} successfully!`);
      }
      
      // Refresh orders to show updated status
      fetchAllOrders();
      fetchInventory();
      if (selectedOrder?.id === orderId) {
        fetchOrderDetails(orderId);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to update order status. Please try again.`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleApplyPostpone = async () => {
    console.log('📅 handleApplyPostpone called', { postponeOrderId, newDeliveryDate });
    
    if (!postponeOrderId || !newDeliveryDate) {
      console.log('❌ Missing postponeOrderId or newDeliveryDate');
      setError('Please select a delivery date');
      return;
    }
    
    setProcessingOrderId(postponeOrderId);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('authToken');
      console.log('📤 Sending postpone request:', {
        url: `${API_BASE_URL}/orders/${postponeOrderId}/postpone`,
        newDeliveryDate
      });
      
      const response = await fetch(`${API_BASE_URL}/orders/${postponeOrderId}/postpone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          newDeliveryDate: newDeliveryDate
        }),
      });

      console.log('📥 Postpone response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Postpone result:', result);
        
        // Create message in English
        const message = `Order postponed successfully! New delivery date: ${result.newDeliveryDate || newDeliveryDate}`;
        setSuccess(message);
        setShowPostponeAlert(true);
        console.log('✅ Show postpone alert set to true');
        
        setTimeout(() => {
          console.log('⏰ Hiding postpone alert after 3 seconds');
          setShowPostponeAlert(false);
        }, 3000);
        
        setShowPostponeModal(false);
        fetchAllOrders();
        if (selectedOrder?.id === postponeOrderId) {
          fetchOrderDetails(postponeOrderId);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorText = await response.text();
        console.error('❌ Postpone failed:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Failed to postpone order delivery date' };
        }
        setError(errorData.error || 'Failed to postpone order delivery date');
      }
    } catch (error) {
      console.error('❌ Postpone error:', error);
      setError('Failed to postpone order delivery date');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleApplyCompensation = async () => {
    if (!compensationOrderId) return;
    
    setProcessingOrderId(compensationOrderId);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/orders/${compensationOrderId}/compensate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: compensationType,
          discountPercentage: compensationType === 'discount' ? parseFloat(discountPercentage) : null,
          plantId: compensationType === 'gift' ? parseInt(selectedPlantId) : null,
          quantity: compensationType === 'gift' ? parseInt(giftQuantity) : null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Compensation result:', result);
        
        let message = '';
        if (compensationType === 'discount') {
          // Create message in English with the new price after discount
          const newPrice = result.newTotal?.toFixed(2) || 'N/A';
          message = `Discount applied successfully! New price after discount: ₪${newPrice}`;
        } else {
          // Create message in English for gift compensation
          message = `Message sent to employee to add gift with the order for the customer`;
        }
        
        console.log('📝 Setting compensation message:', message);
        setCompensationMessage(message);
        setAlertCompensationType(compensationType); // Save the type for the alert
        setSuccess(message);
        setShowCompensationAlert(true);
        console.log('✅ Show compensation alert set to true, type:', compensationType);
        
        // Hide alert after 3 seconds
        setTimeout(() => {
          console.log('⏰ Hiding compensation alert after 3 seconds');
          setShowCompensationAlert(false);
          setCompensationMessage('');
        }, 3000);
        
        setShowCompensationModal(false);
        fetchAllOrders();
        if (selectedOrder?.id === compensationOrderId) {
          fetchOrderDetails(compensationOrderId);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorText = await response.text();
        console.error('❌ Compensation failed:', response.status, errorText);
        setError('Failed to compensate customer');
      }
    } catch (error) {
      setError('Failed to compensate customer');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleProblemResolution = async (orderId: number, action: 'modify' | 'compensate' | 'cancel' | 'postpone', details?: string) => {
    console.log('🔧 handleProblemResolution called:', { orderId, action });
    
    // For modal actions, don't set processing state immediately
    if (action === 'compensate' || action === 'postpone') {
      setError('');
      setSuccess('');
    } else {
    setProcessingOrderId(orderId);
      setError('');
      setSuccess('');
    }
    
    try {
      const token = localStorage.getItem('authToken');
      
      // If action is 'cancel', update order status to 'cancelled'
      if (action === 'cancel') {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'cancelled' }),
        });

        if (response.ok) {
          setSuccess('Order cancelled successfully!');
          setShowRejectAlert(true);
          setTimeout(() => {
            setShowRejectAlert(false);
          }, 3000);
          fetchAllOrders();
          if (selectedOrder?.id === orderId) {
            fetchOrderDetails(orderId);
          }
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Failed to cancel order');
        }
      } else if (action === 'postpone') {
        // Open postpone modal
        console.log('📅 Opening postpone modal for order:', orderId);
        setProcessingOrderId(null); // Reset processing state first
        setPostponeOrderId(orderId);
        // Set default date to 1 month from now
        const defaultDate = new Date();
        defaultDate.setMonth(defaultDate.getMonth() + 1);
        const defaultDateString = defaultDate.toISOString().split('T')[0];
        setNewDeliveryDate(defaultDateString);
        console.log('📅 Default date set to:', defaultDateString);
        setShowPostponeModal(true);
        console.log('✅ Postpone modal state set to true');
      } else if (action === 'compensate') {
        // Open compensation modal
        console.log('🎁 Opening compensation modal for order:', orderId);
        setProcessingOrderId(null); // Reset processing state first
        setCompensationOrderId(orderId);
        setCompensationType('discount');
        setDiscountPercentage('25');
        setSelectedPlantId('');
        setGiftQuantity('1');
        // Ensure plants are loaded when modal opens
        if (availablePlants.length === 0) {
          console.log('🌱 Loading plants...');
          fetchAvailablePlants();
        }
        setShowCompensationModal(true);
        console.log('✅ Compensation modal state set to true');
      } else if (action === 'modify') {
        // Navigate to order edit page
        console.log('✏️ Navigating to order edit page for order:', orderId);
        navigate(`/order-edit/${orderId}`);
        setProcessingOrderId(null); // Reset processing ID
      } else {
        // For other actions, use the resolve endpoint
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, details }),
      });

      if (response.ok) {
        setSuccess(`Order problem resolved: ${action}`);
        fetchAllOrders();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to resolve problem');
        }
      }
    } catch (error) {
      setError('Failed to resolve problem');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'preparing':
        return 'preparing';
      case 'delivered':
        return 'delivered';
      case 'controlled':
        return 'controlled';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  };

  const checkInventoryAvailability = (order: Order): { available: boolean; issues: string[] } => {
    const issues: string[] = [];
    if (!order.order_items) return { available: true, issues: [] };

    for (const item of order.order_items) {
      const invItem = inventory.find(inv => inv.id === item.inventory_item_id);
      if (!invItem) {
        issues.push(`${item.inventory_item?.plant?.name || item.inventory_item?.name}: Not found in inventory`);
      } else if (invItem.quantity_on_hand < item.quantity) {
        issues.push(`${item.inventory_item?.plant?.name || item.inventory_item?.name}: Insufficient stock (Available: ${invItem.quantity_on_hand}, Required: ${item.quantity})`);
      }
    }

    return { available: issues.length === 0, issues };
  };

  const largeOrders = Array.isArray(orders) ? orders.filter(order => order.is_large_order || order.total_amount >= minOrderAmountForApproval) : [];
  const newOrders = Array.isArray(orders) ? orders.filter(order => {
    const orderDate = new Date(order.placed_at);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return orderDate >= oneDayAgo;
  }) : [];

  if (isLoading) {
    return (
      <div className="order-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="order-management-centered">
      <div className="order-management-container">
        <header className="order-management-header">
          <div className="header-left">
            <h1>Order Management</h1>
            <p className="welcome-text">Manage orders, inventory, and track deliveries</p>
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
        
        {/* Approval Alert Toast */}
        {showApprovalAlert && (
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: '#10b981',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              fontSize: '1rem',
              fontWeight: '600',
              animation: 'slideIn 0.3s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>✅</span>
            <span>Order approved successfully!</span>
          </div>
        )}

        {/* Reject Alert Toast */}
        {showRejectAlert && (
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: '#ef4444',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              fontSize: '1rem',
              fontWeight: '600',
              animation: 'slideIn 0.3s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>❌</span>
            <span>Order rejected successfully!</span>
          </div>
        )}

        {/* Postpone Alert Toast */}
        {showPostponeAlert && (
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: '#3b82f6',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              fontSize: '1rem',
              fontWeight: '600',
              animation: 'slideIn 0.3s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>📅</span>
            <span>Order postponed successfully!</span>
          </div>
        )}

        {/* Compensation Alert Toast */}
        {showCompensationAlert && (
          <div 
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: alertCompensationType === 'discount' ? '#10b981' : '#f59e0b',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 10000,
              fontSize: '1rem',
              fontWeight: '600',
              animation: 'slideIn 0.3s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{alertCompensationType === 'discount' ? '✅' : '🎁'}</span>
            <span>{compensationMessage || 'Compensation applied successfully!'}</span>
          </div>
        )}

        {/* Orders Statistics */}
        <div className="orders-statistics">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{Array.isArray(orders) ? orders.length : 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">Today</div>
              <div className="stat-value">
                {Array.isArray(orders) ? orders.filter(order => {
                  const orderDate = new Date(order.placed_at);
                  const today = new Date();
                  return orderDate.toDateString() === today.toDateString();
                }).length : 0}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📆</div>
            <div className="stat-content">
              <div className="stat-label">This Week</div>
              <div className="stat-value">
                {Array.isArray(orders) ? orders.filter(order => {
                  const orderDate = new Date(order.placed_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return orderDate >= weekAgo;
                }).length : 0}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🗓️</div>
            <div className="stat-content">
              <div className="stat-label">This Month</div>
              <div className="stat-value">
                {Array.isArray(orders) ? orders.filter(order => {
                  const orderDate = new Date(order.placed_at);
                  const monthAgo = new Date();
                  monthAgo.setMonth(monthAgo.getMonth() - 1);
                  return orderDate >= monthAgo;
                }).length : 0}
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-label">Total Employees</div>
              <div className="stat-value">{totalEmployees}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <div className="stat-label">Website Visitors</div>
              <div className="stat-value">{websiteVisitors.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            All Orders ({Array.isArray(orders) ? orders.length : 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'large-orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('large-orders')}
          >
            Large Orders ({largeOrders.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            Problems ({problemOrders.length})
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header-bar">
              <h2>All Orders</h2>
              <div className="filters-bar">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-filter"
            >
                  <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
                  <option value="preparing">Preparing</option>
                  <option value="delivered">Delivered</option>
                  <option value="controlled">Controlled</option>
                  <option value="cancelled">Cancelled</option>
            </select>
          <div className="orders-count">
            Showing {filteredOrders.length} of {Array.isArray(orders) ? orders.length : 0} orders
          </div>
        </div>
              </div>

              {isLoadingOrders ? (
                <div className="loading-state">
                  <div className="loading-spinner-small"></div>
                  <p>Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <p>No orders found.</p>
                </div>
              ) : (
              <div className="orders-grid">
                {filteredOrders.map((order) => {
                  const inventoryCheck = checkInventoryAvailability(order);
                  return (
                    <div 
                          key={order.id}
                      className={`order-card ${selectedOrder?.id === order.id ? 'selected' : ''} ${!inventoryCheck.available ? 'inventory-warning' : ''}`}
                          onClick={() => fetchOrderDetails(order.id)}
                        >
                      <div className="order-card-header">
                        <div className="order-id">ORD-{String(order.id).padStart(3, '0')}</div>
                        <span className={`order-status-badge ${getStatusColor(order.status)}`}>
                          {order.status.toUpperCase()}
                            </span>
                      </div>
                      
                      <div className="order-card-body">
                        <div className="order-customer-info">
                          <strong>{order.customer?.user?.full_name || 'Unknown Customer'}</strong>
                          <span className="order-email">{order.customer?.user?.email || 'N/A'}</span>
                          <span className="order-phone">{order.customer?.user?.phone || 'N/A'}</span>
                        </div>
                        
                        <div className="order-amount">₪{parseFloat(order.total_amount.toString()).toLocaleString()}</div>
                        <div className="order-date">{formatDate(order.placed_at)}</div>
                        
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="order-items-preview">
                            <strong>Items:</strong>
                            {order.order_items.map((item, idx) => (
                              <span key={idx}>
                                {item.inventory_item?.plant?.name || item.inventory_item?.name} (x{item.quantity})
                              </span>
                            ))}
                          </div>
                        )}

                        {!inventoryCheck.available && (
                          <div className="inventory-alert">
                            ⚠️ Inventory Issues: {inventoryCheck.issues.join(', ')}
                          </div>
                        )}

                        {order.complaint && (
                          <div className="complaint-alert">
                            ⚠️ Complaint: {order.complaint}
                          </div>
                        )}

                        {order.delay_reason && (
                          <div className="delay-alert">
                            ⏱️ Delay: {order.delay_reason}
                          </div>
                        )}
                      </div>

                      <div className="order-card-actions">
                            <button
                          className="btn-view-details"
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchOrderDetails(order.id);
                              }}
                            >
                              View Details
                            </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
        )}

        {activeTab === 'large-orders' && (
          <div className="large-orders-section">
            <div className="section-header-bar">
              <h2>Large Orders Requiring Approval</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <p>Orders over ₪{minOrderAmountForApproval.toLocaleString()} require manager approval</p>
                <button
                  className="btn-edit-threshold"
                  onClick={() => {
                    setNewThreshold(minOrderAmountForApproval.toString());
                    setShowEditThreshold(true);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  ✏️ Edit Threshold
                </button>
              </div>
          </div>

          {showEditThreshold && (
            <div style={{
              background: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              border: '2px solid #e5e7eb'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#047857' }}>Edit Approval Threshold</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '600', color: '#374151' }}>
                  Minimum Order Amount (₪):
                  <input
                    type="number"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    min="0"
                    step="100"
                    style={{
                      marginLeft: '0.5rem',
                      padding: '0.5rem',
                      border: '2px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      width: '150px'
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    const value = parseInt(newThreshold, 10);
                    if (!isNaN(value) && value >= 0) {
                      setMinOrderAmountForApproval(value);
                      localStorage.setItem('minOrderAmountForApproval', value.toString());
                      setShowEditThreshold(false);
                      setSuccess(`Approval threshold updated to ₪${value.toLocaleString()}`);
                      setTimeout(() => setSuccess(''), 3000);
                    } else {
                      setError('Please enter a valid number');
                      setTimeout(() => setError(''), 3000);
                    }
                  }}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowEditThreshold(false);
                    setNewThreshold('');
                  }}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

            {largeOrders.length === 0 ? (
              <div className="empty-state">
                <p>No large orders pending approval.</p>
                  </div>
            ) : (
              <div className="large-orders-list">
                {largeOrders.map((order) => {
                  const inventoryCheck = checkInventoryAvailability(order);
                  return (
                    <div key={order.id} className="large-order-card">
                      <div className="large-order-header">
                        <div>
                          <h3>ORD-{String(order.id).padStart(3, '0')}</h3>
                          <p>{order.customer?.user?.full_name || 'Unknown Customer'}</p>
                        </div>
                        <div className="large-order-amount">₪{parseFloat(order.total_amount.toString()).toLocaleString()}</div>
                </div>

                      <div className="large-order-details">
                        <div className="detail-row">
                          <span>Date:</span>
                          <span>{formatDate(order.placed_at)}</span>
                    </div>
                        <div className="detail-row">
                          <span>Items:</span>
                          <span>
                            {order.order_items?.map((item, idx) => (
                              <span key={idx}>
                                {item.inventory_item?.plant?.name || item.inventory_item?.name} (x{item.quantity}) - ₪{item.unit_price * item.quantity}
                                {idx < (order.order_items?.length || 0) - 1 ? ', ' : ''}
                              </span>
                            ))}
                      </span>
                    </div>
                        <div className="detail-row">
                          <span>Delivery Address:</span>
                          <span>{order.delivery_address || 'N/A'}</span>
                    </div>
                        <div className="detail-row">
                          <span>Payment:</span>
                          <span>{order.payment_method || 'N/A'} - {order.payment_status || 'N/A'}</span>
                    </div>
                        {!inventoryCheck.available && (
                          <div className="inventory-alert">
                            ⚠️ <strong>Inventory Issues:</strong> {inventoryCheck.issues.join(', ')}
                    </div>
                        )}
                  </div>

                      <div className="large-order-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleStatusChange(order.id, 'approved')}
                          disabled={processingOrderId === order.id || !inventoryCheck.available}
                        >
                          {processingOrderId === order.id ? 'Processing...' : 'Approve Order'}
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          disabled={processingOrderId === order.id}
                        >
                          Reject
                        </button>
                        <button
                          className="btn-view"
                          onClick={() => fetchOrderDetails(order.id)}
                        >
                          View Full Details
                        </button>
                    </div>
                    </div>
                  );
                })}
                    </div>
            )}
                    </div>
        )}

        {activeTab === 'problems' && (
          <div className="problems-section">
            <div className="section-header-bar">
              <h2>Problem Orders</h2>
              <p>Orders with complaints, delays, or inventory issues</p>
                  </div>

            {problemOrders.length === 0 ? (
              <div className="empty-state">
                <p>No problem orders at the moment.</p>
              </div>
            ) : (
              <div className="problems-list">
                {problemOrders.map((order) => {
                  const inventoryCheck = checkInventoryAvailability(order);
                  return (
                    <div key={order.id} className="problem-order-card">
                      <div className="problem-header">
                        <div>
                          <h3>ORD-{String(order.id).padStart(3, '0')}</h3>
                          <p>{order.customer?.user?.full_name || 'Unknown Customer'}</p>
                        </div>
                        <span className={`order-status-badge ${getStatusColor(order.status)}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="problem-details">
                        {order.complaint && (
                          <div className="problem-item complaint">
                            <strong>Customer Complaint:</strong>
                            <p>{order.complaint}</p>
                          </div>
                        )}
                        {order.delay_reason && (
                          <div className="problem-item delay">
                            <strong>Delay Reason:</strong>
                            <p>{order.delay_reason}</p>
                            </div>
                        )}
                        {!inventoryCheck.available && (
                          <div className="problem-item inventory">
                            <strong>Inventory Issues:</strong>
                            <ul>
                              {inventoryCheck.issues.map((issue, idx) => (
                                <li key={idx}>{issue}</li>
                              ))}
                            </ul>
                              </div>
                        )}
                      </div>

                      <div className="problem-actions">
                        <button
                          className="btn-modify"
                          onClick={() => handleProblemResolution(order.id, 'modify')}
                          disabled={processingOrderId === order.id}
                        >
                          Modify Order
                        </button>
                        <button
                          className="btn-compensate"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🎁 Compensate button clicked for order:', order.id);
                            handleProblemResolution(order.id, 'compensate');
                          }}
                          disabled={processingOrderId === order.id}
                        >
                          Compensate Customer
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('❌ Cancel button clicked for order:', order.id);
                            handleProblemResolution(order.id, 'cancel');
                          }}
                          disabled={processingOrderId === order.id}
                        >
                          Cancel Order
                        </button>
                        <button
                          className="btn-postpone"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('📅 Postpone button clicked for order:', order.id);
                            handleProblemResolution(order.id, 'postpone');
                          }}
                          disabled={processingOrderId === order.id}
                        >
                          Postpone
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {selectedOrder && (
          <div className="order-details-modal" onClick={() => setSelectedOrder(null)}>
            <div className="order-details-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Order Details - ORD-{String(selectedOrder.id).padStart(3, '0')}</h2>
                <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
              </div>

              <div className="modal-body">
                <div className="details-section">
                  <h3>Order Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className={`order-status-badge ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Total Amount:</label>
                      <span className="amount">₪{parseFloat(selectedOrder.total_amount.toString()).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <label>Placed At:</label>
                      <span>{formatDate(selectedOrder.placed_at)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Last Updated:</label>
                      <span>{formatDate(selectedOrder.updated_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Customer Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Name:</label>
                      <span>{selectedOrder.customer?.user?.full_name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{selectedOrder.customer?.user?.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Phone:</label>
                      <span>{selectedOrder.customer?.user?.phone || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Delivery Address:</label>
                      <span>{selectedOrder.delivery_address || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h3>Order Items</h3>
                  <div className="order-items-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th>Stock Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.order_items?.map((item) => {
                          const invItem = inventory.find(inv => inv.id === item.inventory_item_id);
                          const available = invItem ? invItem.quantity_on_hand : 0;
                          const sufficient = available >= item.quantity;
                          return (
                            <tr key={item.id} className={!sufficient ? 'insufficient-stock' : ''}>
                              <td>{item.inventory_item?.plant?.name || item.inventory_item?.name || 'Unknown'}</td>
                              <td>{item.quantity}</td>
                              <td>₪{parseFloat(item.unit_price.toString()).toFixed(2)}</td>
                              <td>₪{(item.quantity * parseFloat(item.unit_price.toString())).toFixed(2)}</td>
                              <td className={sufficient ? 'stock-ok' : 'stock-low'}>
                                {available} {sufficient ? '✓' : '✗'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="details-section">
                    <h3>Change Order Progress</h3>
                  <div className="status-controls">
                    <select
                      className="status-select"
                      value={selectedOrder.status}
                      onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                      disabled={processingOrderId === selectedOrder.id}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="preparing">Preparing</option>
                      <option value="delivered">Delivered</option>
                      <option value="controlled">Controlled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {processingOrderId === selectedOrder.id && (
                      <span className="processing-indicator">Processing...</span>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Compensation Modal */}
      {showCompensationModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowCompensationModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: '#047857' }}>Compensate Customer</h2>
              <p style={{ color: '#64748b', margin: 0 }}>Choose compensation method:</p>
    </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                Compensation Type:
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="discount"
                    checked={compensationType === 'discount'}
                    onChange={(e) => setCompensationType(e.target.value as 'discount' | 'gift')}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Discount
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    value="gift"
                    checked={compensationType === 'gift'}
                    onChange={(e) => setCompensationType(e.target.value as 'discount' | 'gift')}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Gift (Plant)
                </label>
              </div>
            </div>

            {compensationType === 'discount' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Discount Percentage:
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                />
                <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  Enter discount percentage (1-100%)
                </p>
              </div>
            )}

            {compensationType === 'gift' && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Select Plant:
                  </label>
                  <select
                    value={selectedPlantId}
                    onChange={(e) => setSelectedPlantId(e.target.value)}
                    disabled={isLoadingPlants}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      cursor: isLoadingPlants ? 'wait' : 'pointer',
                      opacity: isLoadingPlants ? 0.6 : 1
                    }}
                  >
                    <option value="">
                      {isLoadingPlants ? 'Loading plants...' : '-- Select Plant --'}
                    </option>
                    {availablePlants.length > 0 ? (
                      availablePlants.map((plant) => {
                        const plantId = plant.PlantID || plant.id || plant.ID;
                        const plantName = plant.PlantName || plant.name || plant.Name || 'Unknown Plant';
                        return (
                          <option key={plantId} value={String(plantId)}>
                            {plantName}
                          </option>
                        );
                      })
                    ) : !isLoadingPlants && (
                      <option value="" disabled>No plants available</option>
                    )}
                  </select>
                  {isLoadingPlants && (
                    <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                      Loading plants from database...
                    </p>
                  )}
                  {!isLoadingPlants && availablePlants.length === 0 && (
                    <p style={{ margin: '0.5rem 0 0 0', color: '#f59e0b', fontSize: '0.875rem' }}>
                      ⚠️ No plants available. Please check the database or add plants first.
                    </p>
                  )}
                  {!isLoadingPlants && availablePlants.length > 0 && (
                    <p style={{ margin: '0.5rem 0 0 0', color: '#10b981', fontSize: '0.875rem' }}>
                      ✓ {availablePlants.length} plant(s) available
                    </p>
                  )}
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Quantity:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={giftQuantity}
                    onChange={(e) => setGiftQuantity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button
                onClick={() => setShowCompensationModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCompensation}
                disabled={
                  processingOrderId === compensationOrderId ||
                  (compensationType === 'discount' && (!discountPercentage || parseFloat(discountPercentage) <= 0 || parseFloat(discountPercentage) > 100)) ||
                  (compensationType === 'gift' && (!selectedPlantId || !giftQuantity || parseInt(giftQuantity) <= 0))
                }
                style={{
                  padding: '0.75rem 1.5rem',
                  background: compensationType === 'discount' ? '#10b981' : '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  opacity: (
                    processingOrderId === compensationOrderId ||
                    (compensationType === 'discount' && (!discountPercentage || parseFloat(discountPercentage) <= 0 || parseFloat(discountPercentage) > 100)) ||
                    (compensationType === 'gift' && (!selectedPlantId || !giftQuantity || parseInt(giftQuantity) <= 0))
                  ) ? 0.5 : 1
                }}
              >
                {processingOrderId === compensationOrderId ? 'Applying...' : 'Apply Compensation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Postpone Modal */}
      {showPostponeModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowPostponeModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: '#047857' }}>Postpone Order Delivery</h2>
              <p style={{ color: '#64748b', margin: 0 }}>Select the new delivery date:</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                New Delivery Date:
              </label>
              <input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
              <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                Select the date you want to postpone the delivery to
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button
                onClick={() => setShowPostponeModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPostpone}
                disabled={processingOrderId === postponeOrderId || !newDeliveryDate}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  opacity: (processingOrderId === postponeOrderId || !newDeliveryDate) ? 0.5 : 1
                }}
              >
                {processingOrderId === postponeOrderId ? 'Postponing...' : 'Postpone Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

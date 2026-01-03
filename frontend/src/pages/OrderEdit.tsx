import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRequireRole } from '../utils/useAuth';
import './OrderEdit.css';

export function OrderEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading, hasAccess } = useRequireRole('manager');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasAccess || isLoading) return;
    fetchOrder();
  }, [id, hasAccess, isLoading]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      navigate('/order-management');
    } catch (err: any) {
      setError(err.message || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return <div className="order-edit-loading">Loading...</div>;
  }

  if (error && !order) {
    return (
      <div className="order-edit-error">
        <p>{error}</p>
        <button onClick={() => navigate('/order-management')}>Back to Orders</button>
      </div>
    );
  }

  return (
    <div className="order-edit">
      <div className="order-edit-header">
        <button onClick={() => navigate('/order-management')} className="back-button">
          ← Back
        </button>
        <h1>Edit Order #{id}</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      {order && (
        <div className="order-edit-content">
          <div className="order-info">
            <h2>Order Information</h2>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Total Amount:</strong> ₪{order.total_amount}</p>
            <p><strong>Customer:</strong> {order.customer?.user?.full_name || 'N/A'}</p>
            <p><strong>Delivery Address:</strong> {order.delivery_address || 'N/A'}</p>
          </div>

          <div className="order-edit-actions">
            <button onClick={handleSave} disabled={saving} className="save-button">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => navigate('/order-management')} className="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




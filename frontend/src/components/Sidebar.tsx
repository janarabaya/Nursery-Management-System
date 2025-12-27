import { NavLink } from 'react-router-dom';
import { useAuth } from '../utils/useAuth';
import './Sidebar.css';

export function Sidebar() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.roles?.includes('manager');

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">PlantIllegence</div>
      <nav>
        <NavLink to="/">Home</NavLink>
        {isManager ? (
          <NavLink to="/manager-dashboard">Manager Dashboard</NavLink>
        ) : (
          <NavLink to="/dashboard">Dashboard</NavLink>
        )}
        {isManager && (
          <>
            <NavLink to="/order-management">Order Management</NavLink>
            <NavLink to="/plant-management">Plant Management</NavLink>
            <NavLink to="/employee-management">Employee Management</NavLink>
            <NavLink to="/inventory-management">Inventory Management</NavLink>
            <NavLink to="/reports">Reports</NavLink>
            <NavLink to="/customer-feedback">Customer Feedback</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}

import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { Orders } from './pages/Orders';
import { Inventory } from './pages/Inventory';
import { PlantHealth } from './pages/PlantHealth';
import { Suppliers } from './pages/Suppliers';
import { Employees } from './pages/Employees';
import { Notifications } from './pages/Notifications';
import { Reports } from './pages/Reports';
import { Register } from './pages/Register';
import { Plants } from './pages/Plants';
import { PlantDetail } from './pages/PlantDetail';
import { Favorites } from './pages/Favorites';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { PaymentMethod } from './pages/PaymentMethod';
import { TrackOrder } from './pages/TrackOrder';
import { About } from './pages/About';
import { RateNursery } from './pages/RateNursery';
import { ManagerOnly } from './pages/ManagerOnly';
import { AccessDenied } from './pages/AccessDenied';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OrderManagement } from './pages/OrderManagement';
import { ManagePlants } from './pages/ManagePlants';
import { SimplePlantManagement } from './pages/SimplePlantManagement';
import { EmployeeManagement } from './pages/EmployeeManagement';
import { InventoryManagement } from './pages/InventoryManagement';
import { CustomerFeedbackPage } from './pages/CustomerFeedbackPage';
import { Settings } from './pages/Settings';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AgriculturalEngineerDashboard } from './pages/AgriculturalEngineerDashboard';
import { SupplierDashboard } from './pages/SupplierDashboard';
import { DeliveryCompanyDashboard } from './pages/DeliveryCompanyDashboard';
import { OrderEdit } from './pages/OrderEdit';

function AppShell() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app-shell">
      <main className="app-main app-main-full">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment-method" element={<PaymentMethod />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/about" element={<About />} />
          <Route path="/rate-nursery" element={<RateNursery />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route 
            path="/manager-dashboard" 
            element={
              <ProtectedRoute requiredRole="manager">
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manager-only" 
            element={
              <ProtectedRoute requiredRole="manager">
                <ManagerOnly />
              </ProtectedRoute>
            } 
          />
          <Route path="/orders" element={<Orders />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route 
            path="/plant-health" 
            element={
              <ProtectedRoute requiredRole={['manager', 'agricultural_engineer']}>
                <PlantHealth />
              </ProtectedRoute>
            } 
          />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute requiredRole={['manager', 'agricultural_engineer']}>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route 
            path="/order-management" 
            element={
              <ProtectedRoute requiredRole="manager">
                <OrderManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/order-edit/:id" 
            element={
              <ProtectedRoute requiredRole="manager">
                <OrderEdit />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/simple-plant-management" 
            element={
              <ProtectedRoute requiredRole={['manager', 'agricultural_engineer']}>
                <SimplePlantManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/plant-management" 
            element={
              <ProtectedRoute requiredRole={['manager', 'agricultural_engineer']}>
                <ManagePlants />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee-management" 
            element={
              <ProtectedRoute requiredRole="manager">
                <EmployeeManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inventory-management" 
            element={
              <ProtectedRoute requiredRole="manager">
                <InventoryManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/customer-feedback" 
            element={
              <ProtectedRoute requiredRole="manager">
                <CustomerFeedbackPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute requiredRole="manager">
                <Settings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee-dashboard" 
            element={
              <ProtectedRoute requiredRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agricultural-engineer-dashboard" 
            element={
              <ProtectedRoute requiredRole="agricultural_engineer">
                <AgriculturalEngineerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/supplier-dashboard" 
            element={
              <ProtectedRoute requiredRole="supplier">
                <SupplierDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/delivery-company-dashboard" 
            element={
              <ProtectedRoute requiredRole="delivery_company">
                <DeliveryCompanyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Router>
          <AppShell />
        </Router>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;

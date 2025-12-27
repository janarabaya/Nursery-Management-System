# Plant Nursery Project - Frontend API Documentation & Backend Requirements

This document contains all technical details about the frontend implementation, API endpoints, data structures, and requirements for building the backend and database.

---

## Table of Contents

1. [Frontend Technology Stack](#frontend-technology-stack)
2. [Project Structure](#project-structure)
3. [API Endpoints](#api-endpoints)
4. [Data Models & Structures](#data-models--structures)
5. [Authentication & Authorization](#authentication--authorization)
6. [Database Requirements](#database-requirements)
7. [Backend Implementation Guide](#backend-implementation-guide)
8. [Environment Configuration](#environment-configuration)

---

## Frontend Technology Stack

### Core Technologies
- **React**: 19.2.3
- **TypeScript**: 4.9.5
- **React Router DOM**: 7.10.1
- **React Scripts**: 5.0.1 (Create React App)

### Key Dependencies
- `http-proxy-middleware`: ^3.0.5 (for API proxying in development)
- `react-router-dom`: ^7.10.1 (routing)
- `@testing-library/react`: ^16.3.0 (testing)

### Development Setup
- **Development Server**: Port 3000 (default React port)
- **Proxy Configuration**: Routes `/api/*` to `http://localhost:5000`
- **Build Tool**: React Scripts (Webpack under the hood)

---

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── PlantCard.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── ContactForm.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── NotificationContainer.tsx
│   ├── contexts/            # React contexts
│   │   ├── LanguageContext.tsx
│   │   └── ThemeContext.tsx
│   ├── pages/               # Page components
│   │   ├── Home.tsx
│   │   ├── Plants.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── EmployeeDashboard.tsx
│   │   ├── CustomerDashboard.tsx
│   │   ├── SupplierDashboard.tsx
│   │   ├── AgriculturalEngineerDashboard.tsx
│   │   ├── DeliveryCompanyDashboard.tsx
│   │   ├── InventoryManagement.tsx
│   │   ├── OrderManagement.tsx
│   │   ├── EmployeeManagement.tsx
│   │   ├── ManagePlants.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   ├── types/               # TypeScript types
│   │   └── auth.ts
│   ├── utils/               # Utility functions
│   │   ├── useAuth.ts
│   │   └── roleUtils.ts
│   ├── App.tsx              # Main app component
│   ├── setupProxy.js        # Proxy configuration
│   └── index.tsx            # Entry point
├── public/                  # Static assets
└── package.json
```

---

## API Endpoints

### Base URLs
- **Development**: `http://localhost:5000` (via proxy `/api`)
- **Alternative**: `http://localhost:3001/api` (used in some components)
- **Access DB**: `http://localhost:4000/api` (for direct Access database operations)

### Authentication Endpoints

#### POST `/api/auth/login`
**Description**: User login  
**Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Response**:
```json
{
  "token": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "full_name": "string",
    "role": "string",
    "roles": ["string"]
  }
}
```
**Used in**: `Login.tsx`

#### POST `/api/auth/register`
**Description**: User registration  
**Body**:
```json
{
  "role": "manager" | "supplier" | "customer" | "employee" | "agriculture_engineer" | "delivery_company",
  "username": "string",
  "phone": "string",
  "address": "string",
  "email": "string",
  "password": "string"
}
```
**Response**: User object with token  
**Used in**: `Register.tsx`

---

### Plants Endpoints

#### GET `/api/plants`
**Description**: Get all active plants (public)  
**Response**: Array of Plant objects  
**Used in**: `Plants.tsx`, `Home.tsx`

#### GET `/api/plants/all`
**Description**: Get all plants (including inactive) - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of Plant objects  
**Used in**: `InventoryManagement.tsx`, `ManagePlants.tsx`

#### POST `/api/plants`
**Description**: Create a new plant - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "name": "string",
  "price": "string",
  "description": "string",
  "imageUrl": "string",
  "category": "string" | ["string"],
  "isPopular": boolean,
  "quantity": number
}
```
**Response**: Created Plant object  
**Used in**: `ManagePlants.tsx`

#### PUT `/api/plants/:id`
**Description**: Update a plant - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**: Partial Plant object  
**Response**: Updated Plant object  
**Used in**: `ManagePlants.tsx`

#### DELETE `/api/plants/:id`
**Description**: Deactivate a plant (soft delete) - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Success message  
**Used in**: `ManagePlants.tsx`

#### GET `/api/plants/:id/health-status`
**Description**: Get plant health status - Engineer only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `AgriculturalEngineerDashboard.tsx`

#### GET `/api/plants/:id/inventory-status`
**Description**: Get plant inventory status  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `ManagePlants.tsx`

#### GET `/api/plants/:id/health-issues`
**Description**: Get plant health issues  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `ManagePlants.tsx`

#### POST `/api/plants/:id/health-issues`
**Description**: Create health issue for plant  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `ManagePlants.tsx`

#### PUT `/api/plants/:id/growth-stage`
**Description**: Update plant growth stage  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `ManagePlants.tsx`

---

### Orders Endpoints

#### GET `/api/orders`
**Description**: Get all orders - Staff only  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: `?status={status}` (optional)  
**Response**: Array of Order objects with items and customer info  
**Used in**: `OrderManagement.tsx`, `EmployeeDashboard.tsx`

#### GET `/api/orders/:id`
**Description**: Get single order details - Staff only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Order object with full details  
**Used in**: `OrderManagement.tsx`

#### POST `/api/orders`
**Description**: Create a new order - Customer only  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "items": [
    {
      "inventory_item_id": number,
      "quantity": number
    }
  ],
  "delivery_address": "string",
  "notes": "string"
}
```
**Response**: Created Order object  
**Used in**: `Checkout.tsx`

#### PATCH `/api/orders/:id/status`
**Description**: Update order status - Staff only  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "status": "pending" | "approved" | "processing" | "shipped" | "delivered" | "cancelled"
}
```
**Response**: Updated Order object  
**Used in**: `OrderManagement.tsx`, `ManagerDashboard.tsx`, `DeliveryCompanyDashboard.tsx`

#### GET `/api/orders/large`
**Description**: Get large orders requiring manager approval  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: `?threshold={number}` (default: 5000)  
**Response**: Array of large orders  
**Used in**: `ManagerDashboard.tsx`

#### POST `/api/orders/:id/resolve`
**Description**: Resolve order issues - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `OrderManagement.tsx`

---

### Inventory Endpoints

#### GET `/api/inventory`
**Description**: Get all inventory items - Staff only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of InventoryItem objects  
**Used in**: `InventoryManagement.tsx`, `OrderManagement.tsx`, `AgriculturalEngineerDashboard.tsx`

#### POST `/api/inventory`
**Description**: Create inventory item - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**: InventoryItem object  
**Response**: Created InventoryItem  
**Used in**: `InventoryManagement.tsx`

#### PATCH `/api/inventory/:id`
**Description**: Update inventory item - Staff only  
**Headers**: `Authorization: Bearer {token}`  
**Body**: Partial InventoryItem object  
**Response**: Updated InventoryItem  
**Used in**: `InventoryManagement.tsx`

#### GET `/api/inventory/planning`
**Description**: Get inventory planning data  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

#### POST `/api/inventory/planning`
**Description**: Create/update inventory plan  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

#### GET `/api/inventory/receiving`
**Description**: Get receiving records  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

#### POST `/api/inventory/receiving`
**Description**: Create receiving record  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

#### GET `/api/inventory/orders`
**Description**: Get inventory-related orders  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

#### POST `/api/inventory/orders`
**Description**: Create inventory order  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

#### GET `/api/inventory/:id/quality`
**Description**: Get inventory item quality check  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

#### POST `/api/inventory/:id/quality`
**Description**: Perform quality check  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `InventoryManagement.tsx`

---

### Employees Endpoints

#### GET `/api/employees`
**Description**: Get all employees - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of Employee objects with User info  
**Used in**: `EmployeeManagement.tsx`, `ManagerDashboard.tsx`, `InventoryManagement.tsx`

#### POST `/api/employees`
**Description**: Create new employee - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "full_name": "string",
  "email": "string",
  "password": "string",
  "role": "string",
  "title": "string",
  "department": "string",
  "phone": "string"
}
```
**Response**: Created Employee object  
**Used in**: `EmployeeManagement.tsx`

#### PUT `/api/employees/:userId`
**Description**: Update employee - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**: Partial Employee object  
**Response**: Updated Employee object  
**Used in**: `EmployeeManagement.tsx`

#### PATCH `/api/employees/:userId/status`
**Description**: Update employee status (active/inactive) - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "is_active": boolean
}
```
**Response**: Updated Employee object  
**Used in**: `EmployeeManagement.tsx`

#### DELETE `/api/employees/:userId`
**Description**: Delete employee (soft delete) - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Success message  
**Used in**: `EmployeeManagement.tsx`

#### GET `/api/employees/count`
**Description**: Get employee count  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `OrderManagement.tsx`

---

### Customers Endpoints

#### GET `/api/customers`
**Description**: Get all customers - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of Customer objects with User info  
**Used in**: `Settings.tsx`

#### GET `/api/customers/me/orders`
**Description**: Get current customer's orders - Customer only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of Order objects  
**Used in**: Customer dashboard pages

---

### Feedback Endpoints

#### POST `/api/feedback`
**Description**: Submit customer feedback  
**Headers**: `Authorization: Bearer {token}` (optional for public)  
**Body**:
```json
{
  "rating": number (1-5, optional),
  "message": "string",
  "customer_id": "uuid" (optional, can be derived from token)
}
```
**Response**: Created Feedback object  
**Used in**: `RateNursery.tsx`

#### GET `/api/feedback`
**Description**: Get all feedback - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: `?reviewed={true|false}` (optional)  
**Response**: Array of Feedback objects  
**Used in**: `ManagerDashboard.tsx`, `CustomerFeedbackPage.tsx`

#### PATCH `/api/feedback/:id/review`
**Description**: Mark feedback as reviewed - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**: (empty or optional data)  
**Response**: Updated Feedback object  
**Used in**: `ManagerDashboard.tsx`, `CustomerFeedbackPage.tsx`

#### POST `/api/feedback/:id/response`
**Description**: Add response to feedback - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `CustomerFeedbackPage.tsx`

#### POST `/api/feedback/:id/resolve`
**Description**: Resolve feedback - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `CustomerFeedbackPage.tsx`

---

### Reports Endpoints

#### GET `/api/reports/sales`
**Description**: Get total sales - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: `?since={date}` (optional)  
**Response**:
```json
{
  "total_sales": number
}
```
**Used in**: Dashboard pages

#### GET `/api/reports/sales-detailed`
**Description**: Get detailed sales report with date range - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: 
- `?startDate={date}`
- `?endDate={date}`
**Response**:
```json
{
  "totalSales": number,
  "totalOrders": number,
  "dailySales": Array<{date: string, total: number, count: number}>,
  "salesByStatus": Array<{status: string, total: number, count: number}>,
  "dateRange": {start: string, end: string}
}
```
**Used in**: `Reports.tsx`, `ManagerDashboard.tsx`

#### GET `/api/reports/orders-detailed`
**Description**: Get detailed orders report - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: `?startDate={date}&endDate={date}`  
**Response**:
```json
{
  "totalOrders": number,
  "orders": Array<Order>,
  "ordersByStatus": Array<{status: string, count: number}>,
  "ordersByDate": Array<{date: string, count: number}>,
  "dateRange": {start: string, end: string}
}
```
**Used in**: `Reports.tsx`, `ManagerDashboard.tsx`

#### GET `/api/reports/customer-activity`
**Description**: Get customer activity report - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: `?startDate={date}&endDate={date}`  
**Response**:
```json
{
  "topCustomers": Array<{
    "customerId": "uuid",
    "customerName": "string",
    "customerEmail": "string",
    "orderCount": number,
    "totalSpent": number
  }>,
  "activityByDay": Array<{
    "date": "string",
    "uniqueCustomers": number,
    "orderCount": number
  }>,
  "dateRange": {start: string, end: string}
}
```
**Used in**: `Reports.tsx`, `ManagerDashboard.tsx`

#### GET `/api/reports/top-selling`
**Description**: Get top selling plants report - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Query Parameters**: `?startDate={date}&endDate={date}`  
**Response**:
```json
[
  {
    "plant_id": number,
    "plant_name": "string",
    "total_sold": number,
    "total_revenue": number,
    "order_count": number
  }
]
```
**Used in**: `Reports.tsx`

#### GET `/api/reports/inventory-low`
**Description**: Get low inventory items - Staff only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of InventoryItem objects  
**Used in**: Dashboard pages

---

### Plant Health Endpoints

#### GET `/api/plant-health`
**Description**: Get all plant health logs - Engineer only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of PlantHealthLog objects  
**Used in**: `AgriculturalEngineerDashboard.tsx`, Reports

#### POST `/api/plant-health`
**Description**: Create plant health log - Engineer only  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "plant_id": number,
  "irrigation_liters": number,
  "fertilization_notes": "string",
  "spraying_notes": "string",
  "disease_detected": "string",
  "diagnosis": "string",
  "recommendation": "string"
}
```
**Response**: Created PlantHealthLog object  
**Used in**: `AgriculturalEngineerDashboard.tsx`

---

### Suppliers Endpoints

#### GET `/api/suppliers`
**Description**: Get all suppliers - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of Supplier objects  
**Used in**: `Settings.tsx`, Supplier management

#### POST `/api/suppliers`
**Description**: Create supplier - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**: Supplier object  
**Response**: Created Supplier object

#### PATCH `/api/suppliers/:id`
**Description**: Update supplier - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Body**: Partial Supplier object  
**Response**: Updated Supplier object

#### GET `/api/supplier/orders`
**Description**: Get supplier orders - Supplier only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `SupplierDashboard.tsx`

#### GET `/api/supplier/products`
**Description**: Get supplier products - Supplier only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `SupplierDashboard.tsx`

#### GET `/api/supplier/delivery-schedule`
**Description**: Get delivery schedule - Supplier only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `SupplierDashboard.tsx`

#### PATCH `/api/supplier/orders/:id/status`
**Description**: Update supplier order status - Supplier only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `SupplierDashboard.tsx`

---

### Delivery Company Endpoints

#### GET `/api/delivery/orders`
**Description**: Get delivery orders - Delivery Company only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `DeliveryCompanyDashboard.tsx`

#### GET `/api/delivery/schedule`
**Description**: Get delivery schedule - Delivery Company only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `DeliveryCompanyDashboard.tsx`

#### GET `/api/delivery/messages`
**Description**: Get delivery messages - Delivery Company only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `DeliveryCompanyDashboard.tsx`

#### POST `/api/delivery/messages/:id/reply`
**Description**: Reply to message - Delivery Company only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `DeliveryCompanyDashboard.tsx`

#### GET `/api/delivery/history`
**Description**: Get delivery history - Delivery Company only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `DeliveryCompanyDashboard.tsx`

#### PATCH `/api/delivery/orders/:id/status`
**Description**: Update delivery order status - Delivery Company only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `DeliveryCompanyDashboard.tsx`

#### POST `/api/delivery/orders/:id/proof`
**Description**: Upload delivery proof - Delivery Company only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `DeliveryCompanyDashboard.tsx`

---

### Notifications Endpoints

#### GET `/api/notifications`
**Description**: Get user notifications  
**Headers**: `Authorization: Bearer {token}`  
**Response**: Array of Notification objects  
**Used in**: `NotificationContainer.tsx`, Dashboard pages

#### POST `/api/notifications`
**Description**: Create notification  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "channel": "string",
  "title": "string",
  "body": "string"
}
```
**Response**: Created Notification object

---

### Settings Endpoints

#### GET `/api/settings/nursery`
**Description**: Get nursery settings - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `Settings.tsx`

#### PUT `/api/settings/nursery`
**Description**: Update nursery settings - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `Settings.tsx`

#### GET `/api/settings/system`
**Description**: Get system settings - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `Settings.tsx`

#### PUT `/api/settings/system`
**Description**: Update system settings - Manager only  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `Settings.tsx`

#### GET `/api/users/profile`
**Description**: Get user profile  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `Settings.tsx`

#### PUT `/api/users/profile`
**Description**: Update user profile  
**Headers**: `Authorization: Bearer {token}`  
**Used in**: `Settings.tsx`

#### POST `/api/users/change-password`
**Description**: Change user password  
**Headers**: `Authorization: Bearer {token}`  
**Body**:
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```
**Used in**: `Settings.tsx`

---

### Access Database Endpoints (Direct Access DB Operations)

#### GET `/api/db/info`
**Description**: Get database info and table names  
**Base URL**: `http://localhost:4000`  
**Response**:
```json
{
  "success": true,
  "tables": ["table1", "table2"],
  "count": number
}
```
**Used in**: `Plants.tsx`, `SimplePlantManagement.tsx`

#### GET `/api/db/table/:tableName`
**Description**: Get all data from a table  
**Base URL**: `http://localhost:4000`  
**Used in**: `Plants.tsx`

#### GET `/api/db/table/:tableName/schema`
**Description**: Get table schema  
**Base URL**: `http://localhost:4000`

#### GET `/api/db/table/:tableName/data`
**Description**: Get table data with pagination  
**Base URL**: `http://localhost:4000`  
**Query Parameters**: `?limit={number}&offset={number}`

#### POST `/api/db/table/:tableName/insert`
**Description**: Insert data into table  
**Base URL**: `http://localhost:4000`  
**Body**: `{ "data": {...} }`  
**Used in**: `SimplePlantManagement.tsx`

#### PUT `/api/db/table/:tableName/update`
**Description**: Update data in table  
**Base URL**: `http://localhost:4000`  
**Body**: `{ "where": {...}, "data": {...} }`  
**Used in**: `SimplePlantManagement.tsx`

#### DELETE `/api/db/table/:tableName/delete`
**Description**: Delete data from table  
**Base URL**: `http://localhost:4000`  
**Body**: `{ "where": {...} }`  
**Used in**: `SimplePlantManagement.tsx`

---

## Data Models & Structures

### User Model
```typescript
interface User {
  id: string; // UUID
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}
```

### Role Model
```typescript
interface Role {
  id: number;
  name: 'manager' | 'employee' | 'customer' | 'supplier' | 'agriculture_engineer' | 'delivery_company';
}
```

### Plant Model
```typescript
interface Plant {
  id: number;
  name: string;
  latin_name?: string;
  category: string | string[]; // Can be comma-separated or array
  description: string;
  care_instructions?: string;
  base_price: number;
  sku: string; // Unique SKU
  image_url: string;
  is_popular: boolean;
  quantity: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  
  // Extended fields used in frontend
  growthStage?: 'seed' | 'seedling' | 'ready_for_sale';
  plantingDate?: string;
  expectedHarvestDate?: string;
  healthStatus?: 'healthy' | 'diseased' | 'pest_infested' | 'damaged';
  plantType?: 'ornamental' | 'vegetable' | 'fruit';
  locationType?: 'indoor' | 'outdoor';
  lifecycleType?: 'seasonal' | 'perennial';
  growthConditions?: {
    lightRequirement?: 'low' | 'medium' | 'high' | 'full_sun';
    temperature?: { min?: number; max?: number; optimal?: number };
    soilType?: string;
  };
  location?: {
    greenhouse?: string;
    row?: string;
    area?: string;
  };
}
```

### InventoryItem Model
```typescript
interface InventoryItem {
  id: number;
  kind: string;
  plant_id?: number;
  name: string;
  sku: string; // Unique SKU
  unit: string; // Default: 'unit'
  quantity_on_hand: number;
  reorder_level: number;
  location?: string;
  created_at: Date;
  updated_at: Date;
  
  // Extended fields
  warehouseLocation?: {
    zone?: string;
    aisle?: string;
    shelf?: string;
    bin?: string;
  };
  receivedDate?: string;
  expiryDate?: string;
  qualityStatus?: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  cost?: number;
  totalValue?: number;
}
```

### Order Model
```typescript
interface Order {
  id: number;
  customer_id: string; // UUID
  status: 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  payment_method?: 'cash' | 'card' | 'online';
  payment_status?: 'pending' | 'paid' | 'failed';
  assigned_employee?: string; // UUID
  delivery_partner_id?: number;
  delivery_address?: string;
  notes?: string;
  placed_at: Date;
  updated_at: Date;
  
  // Relations (when included)
  customer?: Customer;
  order_items?: OrderItem[];
}
```

### OrderItem Model
```typescript
interface OrderItem {
  id: number;
  order_id: number;
  inventory_item_id: number;
  quantity: number;
  unit_price: number;
  
  // Relations (when included)
  inventory_item?: InventoryItem;
}
```

### Customer Model
```typescript
interface Customer {
  user_id: string; // UUID (primary key)
  preferred_contact?: string;
  address?: string;
  city?: string;
  country?: string;
  
  // Relations
  user?: User;
}
```

### Employee Model
```typescript
interface Employee {
  user_id: string; // UUID (primary key)
  title?: string;
  department?: string;
  is_active: boolean;
  hired_at?: Date;
  
  // Relations
  user?: User;
}
```

### Supplier Model
```typescript
interface Supplier {
  id: number;
  user_id?: string; // UUID
  company_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
}
```

### PlantHealthLog Model
```typescript
interface PlantHealthLog {
  id: number;
  plant_id: number;
  logged_by: string; // UUID (employee user_id)
  irrigation_liters?: number;
  fertilization_notes?: string;
  spraying_notes?: string;
  disease_detected?: string;
  diagnosis?: string;
  recommendation?: string;
  logged_at: Date;
  
  // Relations
  plant?: Plant;
}
```

### CustomerFeedback Model
```typescript
interface CustomerFeedback {
  id: number;
  customer_id: string; // UUID
  message: string;
  rating?: number; // 1-5
  is_reviewed: boolean;
  reviewed_by?: string; // UUID
  reviewed_at?: Date;
  created_at: Date;
  updated_at: Date;
  
  // Relations
  customer?: Customer;
}
```

### Notification Model
```typescript
interface Notification {
  id: number;
  user_id: string; // UUID
  channel: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: Date;
}
```

---

## Authentication & Authorization

### Authentication Method
- **JWT (JSON Web Token)** based authentication
- Token stored in `localStorage` as `authToken`
- Token sent in request headers: `Authorization: Bearer {token}`

### User Roles
1. **manager** - Full system access
2. **employee** - Staff operations (orders, inventory viewing)
3. **customer** - Customer operations (view plants, place orders)
4. **supplier** - Supplier-specific operations
5. **agriculture_engineer** - Plant health monitoring
6. **delivery_company** - Delivery operations

### Protected Routes
Frontend uses `ProtectedRoute` component and `useRequireRole` hook to protect routes:
- Manager-only pages: `ManagerDashboard`, `InventoryManagement`, `EmployeeManagement`, `Settings`
- Staff pages: `EmployeeDashboard`, `OrderManagement`
- Role-specific dashboards: Each role has its own dashboard

### Role Guards (Backend Required)
The backend should implement role-based access control:
- `adminOnly` - Manager role only
- `staff` - Manager, Employee roles
- `customer` - Customer role only
- `engineer` - Agriculture Engineer role only

---

## Database Requirements

### Database System
The project currently supports two database systems:
1. **PostgreSQL** (via Sequelize ORM) - Primary database
2. **Microsoft Access** - Legacy database integration

### Access Database Path
```
C:\Users\ayedr\OneDrive\Desktop\jana\Last Semester Courses\Graguation Project\NurseryDB1.accdb
```

### Required Tables (PostgreSQL/Sequelize)

#### Core Tables
1. **users** - User accounts
2. **roles** - Role definitions
3. **user_roles** - User-role mapping (many-to-many)
4. **customers** - Customer profiles
5. **employees** - Employee profiles
6. **suppliers** - Supplier information
7. **plants** - Plant catalog
8. **inventory_items** - Inventory stock
9. **orders** - Customer orders
10. **order_items** - Order line items
11. **plant_health_logs** - Plant health records
12. **notifications** - User notifications
13. **customer_feedback** - Customer reviews/feedback

### Table Relationships

```
users ←→ user_roles ←→ roles
users → customers (1:1)
users → employees (1:1)
customers → orders (1:many)
orders → order_items (1:many)
order_items → inventory_items (many:1)
inventory_items → plants (many:1)
plants → plant_health_logs (1:many)
plant_health_logs → employees (many:1)
customers → customer_feedback (1:many)
users → notifications (1:many)
```

### Database Schema Details

#### users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR,
  phone VARCHAR,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### roles Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL
);
```

#### user_roles Table
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

#### plants Table
```sql
CREATE TABLE plants (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  latin_name VARCHAR,
  category VARCHAR,
  description TEXT,
  care_instructions TEXT,
  base_price DECIMAL(10,2),
  sku VARCHAR UNIQUE NOT NULL,
  image_url VARCHAR,
  is_popular BOOLEAN DEFAULT false,
  quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### inventory_items Table
```sql
CREATE TABLE inventory_items (
  id SERIAL PRIMARY KEY,
  kind VARCHAR,
  plant_id INTEGER REFERENCES plants(id),
  name VARCHAR,
  sku VARCHAR UNIQUE NOT NULL,
  unit VARCHAR DEFAULT 'unit',
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  location VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(user_id),
  status VARCHAR DEFAULT 'pending',
  total_amount DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR DEFAULT 'cash',
  payment_status VARCHAR DEFAULT 'pending',
  assigned_employee UUID REFERENCES employees(user_id),
  delivery_partner_id INTEGER REFERENCES suppliers(id),
  delivery_address TEXT,
  notes TEXT,
  placed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### order_items Table
```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  inventory_item_id INTEGER REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
);
```

---

## Backend Implementation Guide

### Backend Technology Stack

#### Current Setup
- **Runtime**: Node.js
- **Framework**: Express.js 5.2.1
- **Language**: TypeScript
- **ORM**: Sequelize 6.37.7
- **Database**: PostgreSQL (via Sequelize), Microsoft Access (via node-adodb)
- **Authentication**: JWT (jsonwebtoken 9.0.3)
- **Password Hashing**: bcrypt 6.0.0
- **Validation**: Joi 18.0.2
- **CORS**: cors 2.8.5

### Required Backend Dependencies

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "typescript": "^5.9.3",
    "sequelize": "^6.37.7",
    "pg": "^8.16.3",
    "pg-hstore": "^2.3.4",
    "jsonwebtoken": "^9.0.3",
    "bcrypt": "^6.0.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "joi": "^18.0.2",
    "morgan": "^1.10.1",
    "node-adodb": "^5.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/node": "^25.0.2",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/bcrypt": "^6.0.0",
    "@types/cors": "^2.8.19",
    "nodemon": "^3.1.11",
    "ts-node": "^10.9.2"
  }
}
```

### Backend Server Configuration

#### Port Configuration
- **Main API Server**: Port 5000 (default)
- **Alternative Port**: 3001 (used in some components)
- **Access DB Server**: Port 4000

#### Environment Variables Required

```env
# Server
PORT=5000
NODE_ENV=development

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plant_nursery
DB_USER=your_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=24h

# Access Database
ACCESS_DB_PATH=C:\Users\ayedr\OneDrive\Desktop\jana\Last Semester Courses\Graguation Project\NurseryDB1.accdb
```

### Backend Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.ts              # Sequelize database config
│   │   └── accessDb.ts        # Access database config
│   ├── models/
│   │   └── index.ts           # Sequelize models
│   ├── routes/
│   │   ├── index.ts           # Route aggregator
│   │   ├── auth.ts            # Authentication routes
│   │   ├── plants.ts          # Plant routes
│   │   ├── orders.ts          # Order routes
│   │   ├── inventory.ts       # Inventory routes
│   │   ├── employees.ts       # Employee routes
│   │   ├── customers.ts       # Customer routes
│   │   ├── feedback.ts        # Feedback routes
│   │   ├── reports.ts         # Report routes
│   │   ├── plantHealth.ts     # Plant health routes
│   │   ├── suppliers.ts       # Supplier routes
│   │   └── notifications.ts   # Notification routes
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication middleware
│   │   └── errorHandler.ts    # Error handling middleware
│   ├── utils/
│   │   └── roles.ts           # Role utilities
│   └── index.ts               # Express app entry point
├── package.json
├── tsconfig.json
└── .env
```

### Required Middleware

1. **CORS Middleware**
   - Enable CORS for frontend origin
   - Allow credentials

2. **JSON Parser**
   - `express.json()` for parsing JSON bodies

3. **Authentication Middleware**
   - JWT token verification
   - Extract user info from token
   - Attach user to request object

4. **Role Guards**
   - Check user roles
   - Restrict access based on permissions

### API Response Format

#### Success Response
```json
{
  "data": {...} or [...],
  "message": "string" (optional)
}
```

#### Error Response
```json
{
  "error": "Error message",
  "message": "Detailed error description" (optional)
}
```

### Error Handling

- Use standard HTTP status codes:
  - `200` - Success
  - `201` - Created
  - `400` - Bad Request
  - `401` - Unauthorized
  - `403` - Forbidden
  - `404` - Not Found
  - `500` - Internal Server Error

- Implement error handling middleware
- Log errors appropriately
- Return user-friendly error messages

---

## Environment Configuration

### Frontend Environment Variables

Create `.env` file in `frontend/`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ACCESS_DB_API_URL=http://localhost:4000/api
```

### Backend Environment Variables

Create `.env` file in `backend/`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plant_nursery
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h

# Access Database
ACCESS_DB_PATH=C:\Users\ayedr\OneDrive\Desktop\jana\Last Semester Courses\Graguation Project\NurseryDB1.accdb
```

---

## Implementation Checklist

### Backend Setup
- [ ] Install all required dependencies
- [ ] Set up PostgreSQL database
- [ ] Configure Sequelize models and associations
- [ ] Implement JWT authentication
- [ ] Create all route handlers
- [ ] Implement role-based access control
- [ ] Set up error handling middleware
- [ ] Configure CORS
- [ ] Create seed data for testing
- [ ] Set up Access database integration (if needed)

### API Endpoints to Implement
- [ ] Authentication endpoints (login, register)
- [ ] Plants CRUD endpoints
- [ ] Orders CRUD and status management
- [ ] Inventory management endpoints
- [ ] Employee management endpoints
- [ ] Customer endpoints
- [ ] Feedback endpoints
- [ ] Report endpoints
- [ ] Plant health endpoints
- [ ] Supplier endpoints
- [ ] Delivery company endpoints
- [ ] Notification endpoints
- [ ] Settings endpoints

### Database Setup
- [ ] Create database schema
- [ ] Set up foreign key relationships
- [ ] Create indexes for performance
- [ ] Seed initial data (roles, admin user)
- [ ] Set up database migrations (if using)

### Testing
- [ ] Test all API endpoints
- [ ] Test authentication flow
- [ ] Test role-based access
- [ ] Test error handling
- [ ] Test database operations
- [ ] Integration testing with frontend

---

## Additional Notes

### File Upload
Some endpoints may require file upload capabilities (images for plants, delivery proofs). Consider implementing:
- Multer middleware for file uploads
- File storage strategy (local filesystem or cloud storage)
- Image processing and optimization

### Pagination
Consider implementing pagination for list endpoints:
- `/api/plants?page=1&limit=20`
- `/api/orders?page=1&limit=50`

### Search and Filtering
Implement search and filtering capabilities:
- `/api/plants?search=rose&category=flower`
- `/api/orders?status=pending&dateFrom=2024-01-01`

### Caching
Consider implementing caching for frequently accessed data:
- Redis for session management
- Cache plant catalog
- Cache reports

### WebSocket Support (Optional)
For real-time notifications, consider WebSocket integration:
- Real-time order updates
- Live inventory notifications
- Instant messaging between roles

---

## Support & Documentation

For questions or issues:
1. Check backend route implementations in `backend/src/routes/`
2. Review Sequelize models in `backend/src/models/index.ts`
3. Check frontend usage in `frontend/src/pages/`

---

**Last Updated**: Based on current codebase analysis  
**Version**: 1.0.0


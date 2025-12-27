# Plant Nursery Backend API

Backend API server for the Plant Nursery Management System using Microsoft Access database.

## Requirements

- **Node.js**: v18.0.0 or higher
- **Windows OS**: Required for Microsoft Access database connectivity
- **Microsoft Access Database Engine**: ACE OLEDB 12.0 driver must be installed
  - Download from: [Microsoft Access Database Engine 2016 Redistributable](https://www.microsoft.com/en-us/download/details.aspx?id=54920)

## Installation

1. Clone the repository and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   copy .env.example .env
   ```

4. Configure the `.env` file with your settings:
   - Set `ACCESS_DB_PATH` to your Microsoft Access database file path
   - Set `JWT_SECRET` to a secure random string

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Main API server port | 5000 |
| ACCESS_DB_PORT | Access DB utility server port | 4000 |
| NODE_ENV | Environment mode | development |
| JWT_SECRET | Secret key for JWT signing | (required) |
| JWT_EXPIRES_IN | JWT token expiration | 24h |
| ACCESS_DB_PATH | Full path to .accdb file | (required) |
| FRONTEND_URL | React frontend URL | http://localhost:3000 |

### Sample .env File

Create a `.env` file in the backend folder with the following content:

```env
# Server Configuration
PORT=5000
ACCESS_DB_PORT=4000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=change_me_in_production_use_a_long_random_string
JWT_EXPIRES_IN=24h

# Database Configuration
# Full path to Microsoft Access database file (.accdb)
# Use double backslashes for Windows paths
ACCESS_DB_PATH=C:\\path\\to\\NurseryDB1.accdb

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## Running the Servers

### Development Mode

Start the main API server (port 5000):
```bash
npm run dev
```

Start the Access DB utility server (port 4000):
```bash
npm run dev:access
```

### Production Mode

Start the main API server:
```bash
npm start
```

Start the Access DB utility server:
```bash
npm run start:access
```

## API Endpoints

### Main API (Port 5000)

| Route | Description |
|-------|-------------|
| `/api/auth` | Authentication (login, register) |
| `/api/plants` | Plant management |
| `/api/orders` | Order management |
| `/api/inventory` | Inventory management |
| `/api/employees` | Employee management |
| `/api/customers` | Customer management |
| `/api/feedback` | Customer feedback |
| `/api/reports` | Reports and analytics |
| `/api/plant-health` | Plant health logs |
| `/api/suppliers` | Supplier management |
| `/api/delivery` | Delivery company operations |
| `/api/notifications` | User notifications |
| `/api/settings` | System settings |

### Access DB Utility API (Port 4000)

| Route | Description |
|-------|-------------|
| `GET /api/db/info` | Get database info and tables |
| `GET /api/db/table/:name` | Get all data from table |
| `GET /api/db/table/:name/schema` | Get table schema |
| `POST /api/db/table/:name/insert` | Insert data |
| `PUT /api/db/table/:name/update` | Update data |
| `DELETE /api/db/table/:name/delete` | Delete data |

## Default Admin User

On first startup, the system creates a default admin user:
- **Email**: admin@example.com
- **Password**: Admin123!
- **Role**: manager

**Important**: Change this password immediately in production!

## Database Schema

The backend expects the following tables in the Access database:

- Users
- Roles
- UserRoles
- Customers
- Employees
- Suppliers
- Plants
- InventoryItems
- Orders
- OrderItems
- PlantHealthLogs
- CustomerFeedback
- Notifications
- Settings

## Troubleshooting

### "Provider cannot be found" Error

Ensure Microsoft Access Database Engine is installed:
1. Download ACE OLEDB 12.0 from Microsoft
2. Install the version matching your Node.js architecture (32-bit or 64-bit)
3. Restart your terminal/IDE

### Database Connection Issues

1. Verify the `ACCESS_DB_PATH` in `.env` is correct
2. Ensure the path uses double backslashes: `C:\\path\\to\\database.accdb`
3. Check file permissions on the database file

## License

ISC


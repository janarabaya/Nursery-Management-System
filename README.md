# User Management CRUD Project

Complete project structure with Node.js/Express backend and Microsoft Access database using node-adodb.

## Project Structure

```
project/
 ├─ backend/
 │   ├─ server.js
 │   ├─ package.json
 │   └─ database.accdb  (add your Access database file here)
 └─ frontend/
     └─ index.html
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create your Microsoft Access database file `database.accdb` in the `backend` folder with a table named `users`:
   - Column: `id` (AutoNumber, Primary Key)
   - Column: `name` (Text)
   - Column: `age` (Number)

4. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3000`

### Frontend Setup

1. Open `frontend/index.html` in your web browser
2. Make sure the backend server is running on port 3000

## API Endpoints

- **POST** `/add` - Add a new user
  - Body: `{ "name": "John", "age": 25 }`

- **PUT** `/update/:id` - Update a user by ID
  - Body: `{ "name": "Jane", "age": 30 }`

- **DELETE** `/delete/:id` - Delete a user by ID

- **GET** `/users` - Get all users

## Dependencies

### Backend
- express
- node-adodb
- cors
- body-parser

## Notes

- Make sure Microsoft Access Database Engine (ACE.OLEDB.12.0) is installed on your system
- The database file `database.accdb` should be placed in the `backend` folder
- The `users` table must have columns: `id`, `name`, `age`

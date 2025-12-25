# Task Track Backend Server

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update with your PostgreSQL credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasktrack_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
```

### 3. Create Database
```sql
CREATE DATABASE tasktrack_db;
```

### 4. Run Database Schema
```bash
psql -U postgres -d tasktrack_db -f db/schema.sql
```

Or using psql:
```bash
psql -U postgres -d tasktrack_db
\i db/schema.sql
```

### 5. Seed Database (Create Admin User)
```bash
npm run seed
```

This will create an admin user:
- Email: `admin@tasktrack.com`
- Password: `admin123`

### 6. Start Server
```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/users` - Get all users
- `GET /api/auth/users/:id` - Get user by ID
- `POST /api/auth/users` - Create user
- `PUT /api/auth/users/:id` - Update user
- `DELETE /api/auth/users/:id` - Delete user
- `GET /api/auth/users/group/:groupId` - Get users by group

### Groups
- `GET /api/groups` - Get all groups
- `GET /api/groups/public` - Get public groups
- `GET /api/groups/:id` - Get group by ID
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/group/:groupId` - Get tasks by group
- `GET /api/tasks/assignee/:assigneeId` - Get tasks by assignee
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Audit Logs
- `GET /api/audit-logs` - Get audit logs
- `POST /api/audit-logs` - Create audit log


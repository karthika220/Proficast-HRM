# Profitcast HRM

Human Resource Management System built with modern web technologies.

## Project Structure

```
profitcast-hrm
│
├── backend
│   ├── prisma
│   │   └── schema.prisma
│   │
│   ├── src
│   │   ├── controllers
│   │   ├── routes
│   │   ├── middleware
│   │   ├── services
│   │   ├── utils
│   │   └── server.js
│   │
│   ├── .env
│   └── package.json
│
├── frontend
│   ├── src
│   │   ├── pages
│   │   ├── components
│   │   ├── api
│   │   ├── context
│   │   └── App.jsx
│   │
│   ├── index.html
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your `.env` file with your database credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/profitcast_hrm?schema=public"
   PORT=5000
   ```

4. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

5. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Technologies Used

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL

### Frontend
- React
- Vite
- React Router

## License

ISC

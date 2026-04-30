# 🗺️ Architecture & Deployment Map

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ASHOK TEX SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                           │
│                    (Vue 3 + Vuetify 3)                        │
│   Vercel: https://ashok-tex.vercel.app                        │
│   Deployed on: Vercel (Global CDN)                            │
└──────────────────────────────────────────────────────────────┘
                            ↓ HTTPS ↓
                      (REST API Calls)
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    REST API BACKEND                           │
│                  (Node.js + Express.js)                       │
│   Railway: https://ashok-tex.up.railway.app                   │
│   Deployed on: Railway (Docker Container)                     │
│   Authentication: JWT (jsonwebtoken)                          │
│   File Uploads: Cloudinary                                    │
└──────────────────────────────────────────────────────────────┘
                            ↓ HTTPS ↓
                       (Database Queries)
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                             │
│                  (MongoDB with Mongoose)                      │
│   MongoDB Atlas: Cloud-hosted NoSQL database                  │
│   Connection: Encrypted SSL/TLS                               │
│   Collections: 11 Mongoose Models                             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  STORAGE & MEDIA                              │
│                      Cloudinary                               │
│   Image Uploads, Processing, Delivery                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Pipeline

```
LOCAL DEVELOPMENT
    ↓
    ├─→ Write Code
    ├─→ Test Locally (npm run dev)
    ├─→ Commit Changes
    └─→ Push to GitHub
         ↓
GITHUB REPOSITORY
    ↓
    ├─→ GitHub Actions CI/CD Runs
    │    ├─ Backend: npm ci & syntax check
    │    └─ Frontend: npm ci & build test
    │
    ├─→ Push Notification Sent
    └─→ Auto-deployment Triggered
         ↓
    ┌────────────────────────────────┐
    │                                │
VERCEL DEPLOYMENT          RAILWAY DEPLOYMENT
(Frontend)                 (Backend)
    │                           │
    ├─ Clone repo              ├─ Clone repo
    ├─ cd frontend/            ├─ cd backend/
    ├─ npm install             ├─ npm install
    ├─ npm run build           ├─ Start server
    ├─ Deploy dist/ to CDN      ├─ Run on container
    │                           │
    ✅ Live at                  ✅ Live at
    vercel.app                  up.railway.app
```

---

## 📊 Technology Stack Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND STACK                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Vue 3     │  │   Vite       │  │   Vuetify 3      │   │
│  │ Framework   │  │ Build Tool   │  │ Component Lib    │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  AG Grid    │  │  Vue Router  │  │  Pinia (State)   │   │
│  │ Data Grid   │  │  Routing     │  │ Store Management │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Axios      │  │  Vue i18n    │  │  SCSS/CSS        │   │
│  │ HTTP Client │  │  i18n & l10n │  │  Styling         │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       BACKEND STACK                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Node.js    │  │  Express.js  │  │  Mongoose        │   │
│  │ Runtime     │  │ Web Framework│  │ ODM Library      │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   JWT       │  │  bcryptjs    │  │  CORS            │   │
│  │ Auth Token  │  │ Password Hash│  │ Cross-Origin     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Multer     │  │  Cloudinary  │  │  async-handler   │   │
│  │ File Upload │  │ Media CDN    │  │ Error Handling   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      DATABASE STACK                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         MongoDB Atlas (Cloud)                        │  │
│  │  - Automatic backups                                 │  │
│  │  - Replication & high availability                   │  │
│  │  - SSL/TLS encryption in transit                     │  │
│  │  - Encrypted at rest                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  Collections (Mongoose Models):                             │
│  ├─ Users (Authentication)                                  │
│  ├─ Companies (Client Data)                                 │
│  ├─ Employees (Staff Records)                               │
│  ├─ Orders (Order Management)                               │
│  ├─ Production (Machine & Shifts)                           │
│  ├─ Labour (Wage Entry)                                     │
│  ├─ Expenses (Cost Tracking)                                │
│  ├─ Payments (Payment Records)                              │
│  ├─ Salary (Payroll Data)                                   │
│  ├─ Nool (Batch Tracking)                                   │
│  └─ Dashboard (Analytics)                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                            │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Layer 1: HTTPS/TLS Encryption
│  ├─ Vercel: Automatic SSL certificates
│  ├─ Railway: Automatic SSL certificates
│  └─ MongoDB: Encrypted connection strings
│
│  Layer 2: Authentication
│  ├─ JWT (JSON Web Tokens) for API auth
│  ├─ Token expiration (configurable)
│  ├─ Refresh token mechanism
│  └─ httpOnly cookies (optional)
│
│  Layer 3: Authorization
│  ├─ Role-based access control (RBAC)
│  ├─ User type validation
│  └─ API endpoint protection
│
│  Layer 4: Data Protection
│  ├─ bcryptjs password hashing
│  ├─ Input validation & sanitization
│  ├─ MongoDB encryption at rest
│  └─ Secure headers (CORS, CSP)
│
│  Layer 5: Infrastructure
│  ├─ Environment variable protection
│  ├─ Secret management (Railway)
│  ├─ DDoS protection (Vercel)
│  └─ Cloudinary secure image delivery
│
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 API Endpoints

```
Authentication
  POST   /api/auth/register       Create new user
  POST   /api/auth/login          User login
  POST   /api/auth/logout         User logout

Companies
  GET    /api/companies           List all companies
  POST   /api/companies           Create company
  PUT    /api/companies/:id       Update company
  DELETE /api/companies/:id       Delete company

Orders
  GET    /api/orders              List all orders
  POST   /api/orders              Create order
  GET    /api/orders/:id          Order details
  PUT    /api/orders/:id          Update order

Payroll
  GET    /api/salary              Salary details
  POST   /api/salary/generate     Generate payroll
  GET    /api/salary/history      Salary history

Reports
  GET    /api/reports/company     Company statement
  GET    /api/reports/production  Production report
  GET    /api/reports/expenses    Expense report

Dashboard
  GET    /api/dashboard           Dashboard metrics
```

---

## 🔄 Data Flow Example: User Login

```
User Browser
    ↓
    │ 1. User enters credentials
    │ 2. Frontend submits form
    ↓
Frontend (Vue 3 + Vite)
    ↓
    │ 3. POST /api/auth/login
    │ 4. Axios sends HTTP request
    │ 5. HTTPS/TLS encrypted
    ↓
Vercel CDN → Railway Backend
    ↓
    │ 6. Express.js receives request
    │ 7. Validates input
    │ 8. Queries MongoDB
    ↓
MongoDB Atlas
    ↓
    │ 9. Returns user record
    │ 10. bcryptjs verifies password
    │ 11. Matches: Yes/No
    ↓
Backend Response
    ↓
    │ 12. If success: Generate JWT
    │ 13. Return token + user data
    │ 14. HTTPS/TLS response sent
    ↓
Frontend (Vue 3)
    ↓
    │ 15. Save token to localStorage
    │ 16. Store user in Pinia
    │ 17. Redirect to Dashboard
    │ 18. Include JWT in future requests
    ↓
User Dashboard ✅
```

---

## 📈 Deployment Statistics

| Metric | Value |
|--------|-------|
| Build Time (Frontend) | ~2-3 minutes |
| Build Time (Backend) | ~1-2 minutes |
| CDN Regions (Vercel) | 280+ |
| Database Regions | 3+ (selectable) |
| Uptime SLA | 99.95%+ |
| Auto-scaling | ✅ Automatic |
| Free Tier Limits | Generous |

---

## 🎯 Module Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD MODULE                     │
│  Key Metrics, Order Table, Expense Summary              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│   COMPANIES  │  ORDERS  │  PRODUCTION  │  LABOUR        │
│   Module     │  Module  │  Module      │  Module        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  EXPENSES  │  PAYMENTS  │  NOOL  │  SALARY              │
│  Module    │  Module    │ Module │  Module              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               REPORTS & ANALYTICS                       │
│  Company Statements, Production, Expenses, Payroll      │
└─────────────────────────────────────────────────────────┘

All modules connected via:
  - Pinia State Store
  - Vue Router
  - Axios API Client
  - JWT Authentication
```

---

## 🔗 Connection Strings Reference

```yaml
Frontend → Backend:
  Protocol: HTTPS
  URL: https://ashok-tex.up.railway.app
  Header: Authorization: Bearer {JWT_TOKEN}

Backend → Database:
  Protocol: HTTPS/TLS
  Driver: Mongoose + MongoDB native driver
  URI: mongodb+srv://user:pass@cluster.mongodb.net/ashok-tex

Backend → Cloudinary:
  Protocol: HTTPS/REST API
  Endpoint: https://api.cloudinary.com/v1_1/
  Auth: API Key + Secret
```

---

## 📦 File Organization

```
ashok-tex/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           ← GitHub Actions pipeline
├── backend/
│   ├── routes/                 ← API endpoints (11 modules)
│   ├── models/                 ← MongoDB schemas
│   ├── middleware/             ← JWT auth middleware
│   ├── cloudinary.js           ← Image upload config
│   ├── server.js               ← Express app setup
│   ├── .env.example            ← Environment template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/              ← Page components (10 modules)
│   │   ├── components/         ← Reusable UI components
│   │   ├── stores/             ← Pinia state management
│   │   ├── router/             ← Vue Router config
│   │   └── plugins/            ← Vuetify, i18n, Axios
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
├── README.md                   ← Project overview
├── QUICK_START.md              ← Deployment guide
├── DEPLOYMENT_CHECKLIST.md     ← Step-by-step checklist
└── .gitignore                  ← Git ignore rules
```

---

**This is your complete system architecture. Refer back here as needed!** 🗺️
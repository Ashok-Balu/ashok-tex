# 🧵 அசோக் டெக்ஸ் — Ashok Tex

**Powerloom Business Management System** | Tamil-first | Vue 3 + Node.js + MongoDB

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/badge/status-Active-brightgreen.svg)](https://github.com/Ashok-Balu/ashok-tex)

## 🚀 Live Demo

- **Web App**: https://ashok-tex.vercel.app
- **API**: https://ashok-tex.up.railway.app
- **Repository**: https://github.com/Ashok-Balu/ashok-tex

---

## 📁 Structure

```
ashok-tex/
├── frontend/          ← Vue 3 + Vuetify + AG Grid
│   ├── src/
│   │   ├── components/common/   StatCard, PageHeader, AgTable
│   │   ├── components/layout/   AppLayout (sidebar + topbar)
│   │   ├── composables/         useUtils, useConfirm
│   │   ├── plugins/             vuetify.js, i18n.js, axios.js
│   │   ├── router/              index.js
│   │   ├── stores/              auth.js, index.js (all stores)
│   │   ├── styles/              main.scss
│   │   └── views/               LoginView, DashboardView, + 9 module views
│   ├── .env
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── backend/           ← Node.js + Express + MongoDB
    ├── middleware/     auth.js (JWT)
    ├── models/         index.js (all 11 Mongoose models)
    ├── routes/         auth, companies, orders, nool, production,
    │                   employees, labour, expenses, payments,
    │                   salary, dashboard, reports
    ├── .env
    ├── index.js
    ├── package.json
    └── seed.js
```

---

## 🚀 Quick Start

### Step 1 — Start MongoDB

```bash
# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod

# Or use MongoDB Atlas (cloud) — update MONGO_URI in backend/.env
```

### Step 2 — Backend

```bash
cd backend
npm install
node seed.js          # Creates users, companies, employees
npm run dev           # Starts on http://localhost:5000
```

### Step 3 — Frontend

```bash
cd frontend
npm install
npm run dev           # Starts on http://localhost:3000
```

Open **http://localhost:3000** and login.

---

## 🔐 Default Logins

| Username | Password    | Role  |
|----------|-------------|-------|
| admin     | admin123    | admin |
| Ashok     | ashok123    | user  |
| Arvinth   | arvinth123  | user  |
| Balusamy  | balusamy123 | user  |
<!-- Add more users here as needed in the future -->

---

## 📦 Tech Stack

| Layer     | Technology                           |
|-----------|--------------------------------------|
| Frontend  | Vue 3, Vite, Vuetify 3, AG Grid Community, Vue I18n, Pinia |
| Backend   | Node.js, Express.js, express-async-handler |
| Database  | MongoDB, Mongoose                    |
| Auth      | JWT (jsonwebtoken) + bcryptjs        |

---

## 🌐 Language Toggle

Switch between **தமிழ்** and **EN** from the sidebar or login page.  
Preference is saved to `localStorage`.

---

## ☁️ Deploy to Production

See **[QUICK_START.md](QUICK_START.md)** for step-by-step deployment guide.

### Quick Deploy
```bash
# Frontend → Vercel
npm run build
# Push to GitHub, Vercel auto-deploys

# Backend → Railway  
# Push to GitHub, Railway auto-deploys

# Database → MongoDB Atlas
# Create free cluster and get connection string
```

### Configuration
1. **Frontend** (`VITE_API_URL`): Set to your Railway backend URL
2. **Backend** (`MONGODB_URI`): Set to your MongoDB Atlas URI
3. **Backend** (`CORS_ORIGIN`): Set to your Vercel frontend URL
4. **Backend** (`CLOUDINARY_*`): Add for image uploads
5. **Backend** (`JWT_SECRET`): Set to a random secure string

📖 See **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** for detailed instructions

---

## 🧩 Modules

| Module     | Key Features |
|------------|-------------|
| Dashboard  | 6 stat cards, order table, expenses, salary progress |
| Companies  | CRUD, default deduction % |
| Orders     | Card grid + AG Grid table, financial summary, order detail page |
| Nool       | Batch receipt tracking, per-order totals |
| Production | Machine + shift entry, daily morning/night summary |
| Labour     | Shift-wise wage entry, Employee Master dialog |
| Expenses   | 7 types, type-wise summary, date range filter |
| Payments   | Cash/Cheque/Bank, order payment status table |
| Salary     | Per-employee progress, quick-pay, partial payments |
| Reports    | Weekly salary, monthly by company/mode, production, expense |

---

## 🔐 Environment Variables

### Backend (`.env`)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/ashok-tex
JWT_SECRET=your-super-secret-key-here
CORS_ORIGIN=https://ashok-tex.vercel.app
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_KEY=your-api-key
CLOUDINARY_SECRET=your-api-secret
```

### Frontend (`.env`)
```env
VITE_API_URL=https://ashok-tex.up.railway.app
VITE_APP_NAME=Ashok Tex
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](QUICK_START.md) | 🚀 Get deployed in 30 minutes |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | ✅ Complete checklist for all platforms |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 📖 Detailed deployment guide |
| [GIT_SETUP.md](GIT_SETUP.md) | 🔧 Git installation & configuration |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/Ashok-Balu/ashok-tex/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Ashok-Balu/ashok-tex/discussions)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Vue.js** - Progressive JavaScript framework
- **Vuetify 3** - Material Design component framework
- **AG Grid** - Enterprise data grid
- **MongoDB** - NoSQL database
- **Express.js** - Web application framework

---

**Built with ❤️ by Ashok Balu**  
Last updated: April 30, 2026

# ✈️ Pilot Portal - Complete Aviation Management System

Modern pilot logbook and aviation management system with **FREE AI chatbot**, built with Angular, Node.js, and MongoDB.

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- 4GB RAM available
- 2GB disk space

### Start Everything in One Command

```bash
docker-compose up --build
```

That's it! The application will be available at:
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:5000  
- **MongoDB**: localhost:27017

First build takes 5-10 minutes. Subsequent starts are instant.

## 🎯 Features

### Core Functionality
- ✅ Digital flight logbook with charts
- ✅ License management (SPL, PPL, CPL, ATPL)
- ✅ Medical certificate tracking (Class 1, Class 2)
- ✅ Pilot profile management
- ✅ PDF document upload and viewing
- ✅ Statistical dashboards

### 🤖 FREE AI Aviation Assistant
- **No API key required!**
- Powered by Hugging Face free inference API
- Comprehensive aviation knowledge base
- Answers questions about:
  - Pilot licenses and requirements
  - Medical certificates and validity
  - Logbook management
  - Weather interpretation
  - Flight planning
  - Emergency procedures
  - Currency requirements

### 🎨 Modern UI
- Dark/Light theme toggle
- Responsive design (mobile & desktop)
- Futuristic aviation-themed interface
- Smooth animations and transitions

## 📦 What's Inside

```
CK-prj/
├── docker-compose.yml          # One-command deployment
├── pilot-portal/               # Angular Frontend
│   ├── Dockerfile             # Frontend container
│   └── nginx.conf             # Web server config
└── pilot-portal-backend/       # Node.js Backend
    ├── Dockerfile             # Backend container
    └── src/controllers/
        └── chat.controller.js # FREE chatbot logic
```

## 🐳 Docker Commands

```bash
# Start services (first time builds automatically)
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services (preserves data)
docker-compose stop

# Stop and remove containers (preserves data)
docker-compose down

# Stop and delete all data
docker-compose down -v

# Rebuild after code changes
docker-compose up --build
```

## 🛠️ Local Development (Without Docker)

### Backend
```bash
cd pilot-portal-backend
npm install
npm run dev
# Runs on http://localhost:5000
```

### Frontend
```bash
cd pilot-portal
npm install
ng serve
# Runs on http://localhost:4200
```

### MongoDB
```bash
# Use Docker for MongoDB
docker run -p 27017:27017 mongo:7.0

# Or install MongoDB locally
brew install mongodb-community
mongod --dbpath=/path/to/data
```

## 🤖 Chatbot Technology

The chatbot uses a **multi-layer approach** for reliable responses:

1. **Primary**: Aviation knowledge base with pattern matching
   - Instant responses for common aviation questions
   - Covers licenses, medicals, weather, regulations, procedures
   
2. **Secondary**: Hugging Face free API (microsoft/DialoGPT-medium)
   - For general conversation
   - No API key required
   - Public inference endpoint

3. **Fallback**: Rule-based responses
   - Guaranteed response even if API is down

### Test the Chatbot

Click the blue chatbot icon (bottom-right) and try:
- "What are PPL requirements?"
- "How long is Class 1 medical valid?"
- "What is required for currency?"
- "How do I plan a flight?"

## 📊 Tech Stack

- **Frontend**: Angular 17, TailwindCSS, DaisyUI
- **Backend**: Node.js, Express.js
- **Database**: MongoDB 7.0
- **AI**: Hugging Face Inference API (free)
- **Deployment**: Docker + Docker Compose
- **Web Server**: Nginx (production)

## 🔒 Configuration

### Change JWT Secret (Important for Production!)

Edit `docker-compose.yml`:
```yaml
environment:
  - JWT_SECRET=your-secure-random-string-here
```

### Change Ports

Edit `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "8080:80"    # Change 8080 to your port

backend:
  ports:
    - "3000:5000"  # Change 3000 to your port
```

## 📸 Screenshots

### Dashboard
- Flight statistics and recent activity
- Medical and license status overview
- Quick access to all features

### Logbook
- Add/edit flight entries
- Monthly flight hours chart
- Aircraft-wise experience breakdown
- Export to CSV

### AI Chatbot
- Click the blue bot icon
- Ask aviation questions
- Get instant expert answers

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and kill process
lsof -i :4200
kill -9 <PID>
```

### Can't Connect to Backend
```bash
# Check logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Database Connection Failed
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Wait for MongoDB to start
docker-compose up
```

### Clean Start
```bash
# Remove everything and start fresh
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## 📚 Documentation

For detailed Docker setup instructions, see [DOCKER_README.md](DOCKER_README.md)

## 🎯 Default Credentials

After registration, you can login with your created account.
First user becomes admin automatically.

## ⚡ Performance

- **Frontend**: Nginx serves static files with gzip compression
- **Backend**: Node.js with connection pooling
- **Database**: MongoDB with indexes on frequently queried fields
- **Chatbot**: < 2 second response time

## 🔐 Security Features

- JWT authentication
- Password hashing (bcrypt)
- CORS enabled
- XSS protection headers
- Secure file uploads

## 📝 License

Educational project for pilot training and logbook management.

## 🆘 Support

For issues:
1. Check `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Try clean restart: `docker-compose down && docker-compose up --build`

---

**Made for pilots by aviation enthusiasts** ✈️ **Fly safe!**

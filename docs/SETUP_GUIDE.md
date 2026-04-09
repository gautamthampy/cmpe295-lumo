# LUMO Setup Guide

This guide will help you set up the LUMO development environment from scratch.

## Step-by-Step Setup

### Step 1: Install Prerequisites

#### On Windows

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Follow installation instructions
   - Ensure WSL 2 is enabled

2. **Install Python 3.11+**
   - Download from: https://www.python.org/downloads/
   - Ensure "Add Python to PATH" is checked during installation
   - Verify: `python --version`

3. **Install Node.js 18+**
   - Download from: https://nodejs.org/
   - Use LTS version
   - Verify: `node --version` and `npm --version`

4. **Install uv**
   ```powershell
   pip install uv
   ```

#### On macOS

1. **Install Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Follow installation instructions

2. **Install Python** (using Homebrew)
   ```bash
   brew install python@3.11
   ```

3. **Install Node.js**
   ```bash
   brew install node@18
   ```

4. **Install uv**
   ```bash
   pip3 install uv
   ```

#### On Linux (Ubuntu/Debian)

1. **Install Docker**
   ```bash
   sudo apt-get update
   sudo apt-get install docker.io docker-compose
   sudo usermod -aG docker $USER
   ```
   Log out and back in for group changes to take effect.

2. **Install Python**
   ```bash
   sudo apt-get install python3.11 python3.11-venv
   ```

3. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install uv**
   ```bash
   pip3 install uv
   ```

### Step 2: Clone and Setup Project

```bash
# Clone repository
git clone <repository-url>
cd cmpe295-lumo

# Verify Docker is running
docker --version
docker-compose --version
```

### Step 3: Start Infrastructure

```bash
# Start all services (PostgreSQL, MinIO, Redis)
docker-compose up -d

# Check services are running
docker-compose ps

# View logs if needed
docker-compose logs -f postgres
```

**Expected Output:**
```
NAME                IMAGE                    STATUS
lumo-postgres       postgres:16-alpine       Up
lumo-minio          minio/minio:latest       Up
lumo-redis          redis:7-alpine           Up
```

### Step 4: Setup Backend

#### Create Virtual Environment

**Windows:**
```powershell
cd backend
uv venv
.\.venv\Scripts\activate
```

**macOS/Linux:**
```bash
cd backend
uv venv
source .venv/bin/activate
```

#### Install Dependencies

```bash
# Install project dependencies
uv pip install -e .

# Install development dependencies
uv pip install -e ".[dev]"
```

#### Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (optional for development)
# The defaults should work for local development
```

#### Verify Backend

```bash
# Start backend server
uvicorn app.main:app --reload

# In another terminal, test the health endpoint
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "lumo-backend",
  "version": "0.1.0"
}
```

### Step 5: Setup Frontend

#### Open New Terminal

**Windows:**
```powershell
cd frontend
```

**macOS/Linux:**
```bash
cd frontend
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment

```bash
# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
```

#### Start Frontend

```bash
npm run dev
```

Visit http://localhost:3000 in your browser.

### Step 6: Verify Setup

1. **Backend API Docs**: http://localhost:8000/api/v1/docs
2. **Frontend**: http://localhost:3000
3. **MinIO Console**: http://localhost:9001 (login: lumo / lumo_dev_password)

## Database Access

### Using psql (PostgreSQL CLI)

```bash
# Access PostgreSQL shell
docker exec -it lumo-postgres psql -U lumo -d lumo

# List schemas
\dn

# List tables in content schema
\dt content.*

# Query lessons
SELECT * FROM content.lessons;

# Exit
\q
```

### Using GUI Client (pgAdmin, DBeaver, etc.)

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Database: `lumo`
- Username: `lumo`
- Password: `lumo_dev_password`

## Common Development Tasks

### Running Backend Tests

```bash
cd backend
pytest tests/ -v --cov=app
```

### Running Frontend Tests

```bash
cd frontend
npm test
```

### Code Formatting

**Backend (Python):**
```bash
cd backend
black app/
ruff check app/
```

**Frontend (TypeScript):**
```bash
cd frontend
npm run lint
```

### Stopping Services

```bash
# Stop Docker services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart postgres
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres

# Backend logs (when running)
# Will appear in terminal where uvicorn is running

# Frontend logs (when running)
# Will appear in terminal where npm run dev is running
```

## Troubleshooting

### Problem: Port Already in Use

**Error:**
```
Error starting userland proxy: listen tcp 0.0.0.0:5432: bind: address already in use
```

**Solution:**
1. Find process using port:
   ```bash
   # Windows
   netstat -ano | findstr :5432
   
   # macOS/Linux
   lsof -i :5432
   ```
2. Stop the conflicting service
3. Or modify port in `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Change external port
   ```

### Problem: Docker Not Running

**Error:**
```
Cannot connect to the Docker daemon
```

**Solution:**
- Start Docker Desktop application
- Ensure Docker daemon is running: `docker ps`
- On Linux, check: `sudo systemctl status docker`

### Problem: Database Connection Error

**Error:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**
1. Check PostgreSQL is running: `docker-compose ps postgres`
2. Wait 10-15 seconds after starting for initialization
3. Check logs: `docker-compose logs postgres`
4. Verify connection details in `.env`

### Problem: Module Not Found (Python)

**Error:**
```
ModuleNotFoundError: No module named 'app'
```

**Solution:**
1. Ensure virtual environment is activated
2. Reinstall: `uv pip install -e .`
3. Check you're in the `backend` directory

### Problem: npm Install Fails

**Error:**
```
npm ERR! code EINTEGRITY
```

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Problem: Frontend Can't Connect to Backend

**Error:**
```
Network Error / CORS Error
```

**Solution:**
1. Ensure backend is running: http://localhost:8000/health
2. Check CORS settings in `backend/app/main.py`
3. Verify API URL in `frontend/.env.local`

## Development Workflow

1. **Start Infrastructure** (once per session)
   ```bash
   docker-compose up -d
   ```

2. **Start Backend** (in one terminal)
   ```bash
   cd backend
   source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
   uvicorn app.main:app --reload
   ```

3. **Start Frontend** (in another terminal)
   ```bash
   cd frontend
   npm run dev
   ```

4. **Make Changes** and test
   - Backend changes auto-reload (with --reload flag)
   - Frontend changes auto-reload (Next.js hot reload)

5. **Stop Development** (when done)
   - Ctrl+C in both terminals
   - `docker-compose down` (optional, to stop databases)

## Next Steps

After completing setup:

1. **Explore API Documentation**: http://localhost:8000/api/v1/docs
2. **Review Contracts**: Read `contracts/api_contracts.yaml` and `contracts/event_schema.json`
3. **Check Privacy Guidelines**: Review `contracts/PRIVACY_GUARDRAILS.md`
4. **Start Phase 2**: Begin implementing baseline components per role assignment

## Getting Help

- **Documentation**: Check `docs/` directory
- **API Issues**: Test endpoints at http://localhost:8000/api/v1/docs
- **Database Issues**: Access DB at localhost:5432 with pgAdmin/DBeaver
- **Team**: Contact team members via project communication channels

## Additional Resources

- FastAPI Documentation: https://fastapi.tiangolo.com/
- Next.js Documentation: https://nextjs.org/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Docker Documentation: https://docs.docker.com/


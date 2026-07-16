# ===========================================
# Stage 1: Build Frontend
# ===========================================
FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ===========================================
# Stage 2: Production Runtime
# ===========================================
FROM python:3.11-slim

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ backend/

# Copy startup script
COPY startup.sh ./

# Copy built frontend from stage 1
COPY --from=frontend-build /build/frontend/dist frontend/dist

# Create workspace directory
RUN mkdir -p workspace

# Create non-root user and set ownership
RUN groupadd --system appuser && \
    useradd --system --gid appuser --home-dir /app appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["/bin/bash", "./startup.sh"]

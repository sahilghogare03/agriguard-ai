# Use official Python slim image
FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Install system dependencies required by OpenCV and runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files (including plant_disease_model.keras, labels.txt, templates, static, etc.)
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start Gunicorn server configured for Cloud Run ($PORT)
# Note: Using 1 worker with multiple threads to optimize TensorFlow model memory usage
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 120 app:app

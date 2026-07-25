# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.10-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for opencv-python (libGL and libgthread)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt ./

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy local code to the container image
COPY . ./

# Run the web service on container startup.
# Web servers bind to the port defined by the PORT environment variable.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app

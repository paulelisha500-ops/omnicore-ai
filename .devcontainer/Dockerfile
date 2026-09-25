FROM mcr.microsoft.com/devcontainers/python:3.12

# Node.js, for running the frontend toolchain from inside the same dev
# container (npm install / npm run dev), alongside the Python backend.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

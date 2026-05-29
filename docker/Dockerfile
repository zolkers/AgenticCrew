FROM ubuntu:24.04 AS dev

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install --no-install-recommends --yes \
    build-essential \
    ca-certificates \
    curl \
    git \
    libayatana-appindicator3-dev \
    libgtk-3-dev \
    librsvg2-dev \
    libwebkit2gtk-4.1-dev \
    pkg-config \
    python3-pip \
    python3.12 \
    python3.12-dev \
    python3.12-venv \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install --no-install-recommends --yes nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs \
  | sh -s -- -y --profile minimal --default-toolchain stable

ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /workspace

EXPOSE 5173

CMD ["sh", "-lc", "npm ci && python3.12 -m pip install --break-system-packages -e 'workers/python[dev]' && npm run dev:docker -w frontend"]

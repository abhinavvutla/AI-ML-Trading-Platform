# Full-Stack Setup Instructions

This application now uses a simplified, powerful single-server architecture. The **Node.js backend** serves the user interface, securely proxies requests to the Alpaca trading API, and handles all AI/ML computations and simulations.

**You only need to run ONE server for the application to function correctly.**

---

## 1. Prerequisites

- **Node.js v18+**: Required for the main web server. Download from [nodejs.org](https://nodejs.org/).

---

## 2. Create `.env` File for API Keys

This is a critical security step. In the project's root directory, create a single file named `.env`.

Your `.env` file must look exactly like this:

```env
# --- API Keys (used by the Node.js server) ---

# Alpaca Paper Trading Credentials
# Used for: Live trading, fetching positions, and as a primary source for market data.
APCA_API_KEY_ID=YOUR_PAPER_API_KEY_HERE
APCA_API_SECRET_KEY=YOUR_PAPER_SECRET_KEY_HERE

# Google AI API Key (for Gemini models)
# Used for: Strategy Maker AI suggestions, News sentiment analysis, etc.
API_KEY=YOUR_GOOGLE_AI_API_KEY_HERE

# Optional: Port for the Node.js server
PORT=3001
```

**Replace `YOUR_..._HERE` with your actual keys.** Do not use quotes.

---

## 3. Setup and Run the Node.js Web Server

Open a terminal or command prompt in the project's root directory.

### Step 3.1: Install Node.js Dependencies

```bash
npm install
```

### Step 3.2: Run the Node.js Server

```bash
npm start
```

You should see output indicating the Node.js server is running on port 3001. **Leave this terminal running.**

---

## 4. Using the App

With the server running, you can now open your browser and navigate to `http://localhost:3001`.

Go to the **Configuration** page and click "Connect to Broker". The request will go to your Node.js server, which will securely communicate with Alpaca. All AI and ML tasks are now handled by this single server.

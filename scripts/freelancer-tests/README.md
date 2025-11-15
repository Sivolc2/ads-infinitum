# Freelancer.com API Test Scripts

This folder contains scripts to test and interact with the Freelancer.com API.

## Prerequisites

1. Python 3.6 or higher
2. Freelancer.com API credentials

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure credentials

Your `.env` file should contain your Freelancer API credentials. There are two approaches:

#### Option A: Simple API Key (if you already have an access token)

```env
FREELANCER-API-KEY=your_access_token_here
```

#### Option B: Full OAuth2 Setup (recommended)

Create an application at: https://accounts.freelancer.com/settings/develop

Then add to `.env`:

```env
FREELANCER_CLIENT_ID=your_client_id
FREELANCER_CLIENT_SECRET=your_client_secret
FREELANCER_REDIRECT_URI=http://localhost:8080/callback
FREELANCER_ACCESS_TOKEN=your_access_token_here
```

### 3. Optional: Use Sandbox Environment

Add this to `.env` to test against sandbox:

```env
FLN_URL=https://www.freelancer-sandbox.com
```

## Available Scripts

### 1. `test_api_basic.py` - Basic API Test

Tests basic authentication and API access.

```bash
python test_api_basic.py
```

**What it tests:**
- Bearer token authentication
- Get current user info
- Fetch public projects

**Use this first** to verify your API key/token works.

### 2. `oauth2_flow.py` - OAuth2 Authentication

Helps you obtain an OAuth2 access token.

```bash
python oauth2_flow.py
```

**Two authentication flows:**

1. **Authorization Code Flow** - Requires user authorization
   - Opens browser for user to authorize
   - Gets authorization code
   - Exchanges code for access token

2. **Client Credentials Flow** - App-only authentication
   - No user interaction needed
   - Good for backend services

**When to use:**
- Your API key doesn't work with basic tests
- You need a fresh access token
- Setting up OAuth2 for the first time

### 3. `test_api_advanced.py` - Advanced API Tests

Tests multiple API endpoints with detailed output.

```bash
python test_api_advanced.py
```

**What it tests:**
- Get authenticated user info
- Search projects
- Get project details
- Search users/freelancers
- Get available skills
- Get active contests

### 4. `test_sdk.py` - Official SDK Test

Tests the official Freelancer Python SDK.

```bash
python test_sdk.py
```

**What it tests:**
- Session creation with SDK
- Get self user info
- Search projects using SDK
- Get project details

**Benefits of SDK:**
- Cleaner, more Pythonic API
- Built-in error handling
- Easier to maintain

### 5. `example_search_and_monitor.py` - Practical Examples

Real-world examples showing how to search and monitor projects.

```bash
python example_search_and_monitor.py
```

**Features:**
- Simple keyword search
- Search with budget filters
- Skill-based search
- Continuous project monitoring
- Formatted output with project details

**Perfect for:**
- Building project monitoring tools
- Finding projects matching criteria
- Automating project discovery

## Quick Start Guide

### If you already have an API key/token:

1. Make sure it's in `.env` as `FREELANCER-API-KEY`
2. Run: `python test_api_basic.py`
3. If it works, try: `python test_api_advanced.py`

### If you need to set up OAuth2:

1. Go to: https://accounts.freelancer.com/settings/develop
2. Create a new application
3. Add credentials to `.env`
4. Run: `python oauth2_flow.py`
5. Copy the access token to `.env`
6. Test with: `python test_api_basic.py`

## API Documentation

- Main docs: https://developers.freelancer.com/
- OAuth2 docs: https://developers.freelancer.com/docs/authentication
- Application dashboard: https://accounts.freelancer.com/settings/develop

## Common Issues

### "Authentication failed"

- Your token might be expired (get a new one with `oauth2_flow.py`)
- Your key might be a client_id (use OAuth2 flow to get access token)
- Check if you need to use sandbox environment

### "Module not found"

```bash
pip install -r requirements.txt
```

### "Connection refused" or timeout

- Check your internet connection
- Try sandbox environment: `FLN_URL=https://www.freelancer-sandbox.com`

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/users/0.1/self` | Get current user info |
| `/projects/0.1/projects` | Search/list projects |
| `/users/0.1/users` | Search users |
| `/projects/0.1/skills` | Get available skills |
| `/contests/0.1/contests` | Get contests |

## Next Steps

After successful testing, you can:

1. Build project posting automation
2. Create bid monitoring tools
3. Develop freelancer search tools
4. Automate contest entry tracking
5. Build notification systems

## Support

- Freelancer API Forum: https://www.freelancer.com/community/developers
- GitHub Issues: Report bugs or ask questions
- Official Docs: https://developers.freelancer.com/

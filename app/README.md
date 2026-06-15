# Battery Testing Tray - Frontend Dashboard

A clean, modular web dashboard for monitoring battery test measurements. Built with vanilla HTML, CSS, and JavaScript for simplicity and ease of integration with the backend API.

## Features

- **Status Dashboard**: Overview of battery test status with idle, scanned, and good chips counts
- **Progress Tracking**: Visual progress bar showing scanning completion
- **Data Table**: Displays all battery measurements with NFC ID, voltage, status, and timestamps
- **Filtering**: Filter by All, Scanned chips, or Good chips
- **Status Indicators**: Color-coded status badges (OK, Waiting, Invalid)
- **Responsive Design**: Mobile-friendly layout
- **Mock Data Ready**: Comes with sample data for testing; easily switch to real API calls

## File Structure

```
app/
├── index.html      # Main HTML structure
├── styles.css      # Styling and layout
├── app.js         # Application logic and API integration
├── Dockerfile     # Docker configuration
└── README.md      # This file
```

## Quick Start

### Option 1: Direct File Access
1. Open `index.html` in your browser
2. Dashboard will display with mock data
3. Open browser console and use `window.DashboardAPI` to interact with the dashboard programmatically

### Option 2: Serve with Backend
The dashboard is ready to be served by your Fastify backend. Ensure CORS is enabled (already configured in `server.js`).

## API Integration Guide

### For Your Colleague

The dashboard is ready to connect to your backend API. Currently, it uses mock data by default.

#### Step 1: Switch to Real API
In `app.js`, change the configuration:

```javascript
const CONFIG = {
    API_BASE: 'http://localhost:3000/api', // Adjust port if needed
    REFRESH_INTERVAL: 5000,
    USE_MOCK_DATA: false  // ← Change this to false
};
```

#### Step 2: Backend API Endpoints

The dashboard expects these endpoints from your backend (already available):

**GET /api/battery**
- Returns: Array of battery measurements
- Expected format:
```json
[
  {
    "id": 1,
    "nfc_id": "CH-7832-A1",
    "voltage": 3.58,
    "percent": 100,
    "slot_id": "slot-1",
    "created_at": "2026-05-18T15:10:00Z"
  }
]
```

**POST /api/battery**
- Submit new measurement
- Body:
```json
{
  "slot_id": "slot-1",
  "voltage": 3.58,
  "percent": 100
}
```

#### Step 3: Data Transformation (if needed)

If your backend returns data in a different format, add a transformation function in `app.js`:

```javascript
async function fetchBatteryData() {
    const response = await fetch(`${CONFIG.API_BASE}/battery`);
    const rawData = await response.json();
    
    // Transform API data to dashboard format
    return rawData.map(item => ({
        nfc_id: item.nfc_id,
        voltage: item.voltage,
        status: item.voltage < 2.4 || item.voltage > 3.6 ? 'Invalid' : 'OK',
        scanned: item.voltage !== null,
        timestamp: new Date(item.created_at).toLocaleString()
    }));
}
```

#### Step 4: Test Connection

In browser console:
```javascript
DashboardAPI.toggleMockData(false);  // Switch to real API
DashboardAPI.refreshDashboard();      // Load data
DashboardAPI.getAppState();           // Check current state
```

## Console API for Testing

The dashboard exposes a global API (`window.DashboardAPI`) for testing and development:

```javascript
// Toggle between mock and real data
DashboardAPI.toggleMockData(false);

// Set custom API base URL
DashboardAPI.setApiBase('http://your-api.com/api');

// Refresh data
DashboardAPI.refreshDashboard();

// Get current state
DashboardAPI.getAppState();
DashboardAPI.getAllData();
DashboardAPI.getStats();

// Submit new measurement (once connected to API)
DashboardAPI.submitBatteryData('slot-1', 3.58, 100);
```

## Docker Integration

The `Dockerfile` in this directory can be used to containerize the frontend. Make sure to configure the API base URL appropriately for your deployment environment.

## Customization

### Change Colors
Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-green: #7bce4a;
    --text-dark: #333;
    /* ... other variables */
}
```

### Add Auto-Refresh
Uncomment this line in `app.js` to enable periodic updates:

```javascript
setInterval(refreshDashboard, CONFIG.REFRESH_INTERVAL);
```

### Modify Status Logic
Update the status determination logic in `app.js`:

```javascript
function getScanStatus(item) {
    // Customize logic here
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Next Steps

1. ✅ Frontend UI complete and styled
2. → Connect to backend API
3. → Add real-time WebSocket updates (optional)
4. → Add user authentication (optional)
5. → Add data export functionality (optional)

## Troubleshooting

### CORS Errors
Ensure your backend has CORS enabled (already configured in `server.js`). If issues persist, check browser console and backend logs.

### Data Not Loading
1. Open browser console (`F12`)
2. Check `DashboardAPI.getAppState()` to see current state
3. Check network tab for API calls
4. Verify `CONFIG.API_BASE` URL is correct

### Mock Data Not Appearing
Ensure `CONFIG.USE_MOCK_DATA` is set to `true` in `app.js`.

## Support

For questions about integrating this dashboard with the backend, refer to the backend documentation or the API endpoints in `backend/server.js`.

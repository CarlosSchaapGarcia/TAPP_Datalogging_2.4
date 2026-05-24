/**
 * Battery Testing Tray Dashboard
 * 
 * This dashboard displays battery test measurements.
 * Currently uses mock data - ready to be connected to the backend API.
 * 
 * API Endpoints to integrate:
 * - GET /api/battery - Get latest measurements
 * - POST /api/battery - Create new measurement
 * - GET /api/battery/validate - Get invalid entries
 */

// ──────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────

const CONFIG = {
    API_BASE: 'http://localhost:3000/api',
    REFRESH_INTERVAL: 5000, // 5 seconds
    USE_MOCK_DATA: true // Toggle this to switch between mock and real API
};

// ──────────────────────────────────────────────
// MOCK DATA (Sample data matching the image)
// ──────────────────────────────────────────────

const MOCK_DATA = [
    { nfc_id: 'CH-7832-A1', voltage: 3.58, status: 'OK', scanned: true, timestamp: '18/05/2026 15:10' },
    { nfc_id: 'CH-7832-A2', voltage: 3.58, status: 'OK', scanned: true, timestamp: '18/05/2026 15:12' },
    { nfc_id: 'CH-7832-A3', voltage: 2.10, status: 'Waiting...', scanned: false, timestamp: '18/05/2026 15:13' },
    { nfc_id: 'CH-7832-A4', voltage: 1.95, status: 'Waiting...', scanned: false, timestamp: '18/05/2026 15:14' },
    { nfc_id: 'CH-7832-A5', voltage: null, status: 'Invalid', scanned: false, timestamp: null },
    { nfc_id: 'CH-7832-A6', voltage: null, status: 'Invalid', scanned: false, timestamp: null },
    { nfc_id: 'CH-7832-A7', voltage: null, status: 'Invalid', scanned: false, timestamp: null },
    { nfc_id: 'CH-7832-A8', voltage: 3.61, status: 'OK', scanned: true, timestamp: '18/05/2026 15:09' },
    { nfc_id: 'CH-7832-A9', voltage: 3.55, status: 'OK', scanned: true, timestamp: '18/05/2026 15:08' },
    { nfc_id: 'CH-7832-A10', voltage: null, status: 'Invalid', scanned: false, timestamp: null },
];

// ──────────────────────────────────────────────
// STATE MANAGEMENT
// ──────────────────────────────────────────────

let appState = {
    allData: [],
    filteredData: [],
    currentFilter: 'all',
    isLoading: false,
    stats: {
        total: 0,
        scanned: 0,
        good: 0,
        invalid: 0,
        progress: 0
    }
};

// ──────────────────────────────────────────────
// UTILITY FUNCTIONS
// ──────────────────────────────────────────────

/**
 * Calculate statistics from data
 */
function calculateStats(data) {
    const stats = {
        total: data.length,
        scanned: data.filter(d => d.scanned).length,
        good: data.filter(d => d.status === 'OK').length,
        invalid: data.filter(d => d.status === 'Invalid').length,
    };
    
    stats.progress = Math.round((stats.scanned / stats.total) * 100) || 0;
    
    return stats;
}

/**
 * Determine scan status indicator based on data
 */
function getScanStatus(item) {
    if (item.status === 'Invalid') {
        return 'not-started';
    } else if (item.status === 'Waiting...') {
        return 'in-progress';
    } else if (item.status === 'OK') {
        return 'finished';
    }
    return 'not-started';
}

/**
 * Format voltage for display
 */
function formatVoltage(voltage) {
    if (voltage === null || voltage === undefined) {
        return '—';
    }
    return voltage.toFixed(2) + 'V';
}

// ──────────────────────────────────────────────
// API FUNCTIONS
// ──────────────────────────────────────────────

/**
 * Fetch data from the backend API
 * Integration point for your colleague to connect to the real database
 */
async function fetchBatteryData() {
    if (CONFIG.USE_MOCK_DATA) {
        // Using mock data for now
        return MOCK_DATA;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE}/battery`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching battery data:', error);
        return MOCK_DATA; // Fallback to mock data on error
    }
}

/**
 * Submit new battery measurement
 * Ready to be called when new data is scanned
 */
async function submitBatteryData(slotId, voltage, percent) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/battery`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                slot_id: slotId,
                voltage: voltage,
                percent: percent
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Battery data submitted:', data);
        refreshDashboard();
        return data;
    } catch (error) {
        console.error('Error submitting battery data:', error);
    }
}

// ──────────────────────────────────────────────
// DATA FILTERING & PROCESSING
// ──────────────────────────────────────────────

/**
 * Filter data based on current filter selection
 */
function filterData(data, filterType) {
    switch (filterType) {
        case 'scanned':
            return data.filter(item => item.scanned);
        case 'good':
            return data.filter(item => item.status === 'OK');
        case 'all':
        default:
            return data;
    }
}

/**
 * Update state with new data
 */
function updateAppState(rawData) {
    appState.allData = rawData;
    appState.stats = calculateStats(rawData);
    applyFilter();
}

/**
 * Apply current filter to data
 */
function applyFilter() {
    appState.filteredData = filterData(appState.allData, appState.currentFilter);
    renderTable();
    updateStats();
}

// ──────────────────────────────────────────────
// RENDERING FUNCTIONS
// ──────────────────────────────────────────────

/**
 * Render the data table with current filtered data
 */
function renderTable() {
    const tbody = document.getElementById('data-tbody');
    
    if (appState.filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = appState.filteredData
        .map(item => `
            <tr>
                <td>${escapeHtml(item.nfc_id)}</td>
                <td>
                    <span class="scan-indicator ${getScanStatus(item)}"></span>
                </td>
                <td>${formatVoltage(item.voltage)}</td>
                <td>
                    <span class="status-badge ${getStatusClass(item.status)}">
                        ${escapeHtml(item.status)}
                    </span>
                </td>
                <td>${item.timestamp || '—'}</td>
            </tr>
        `)
        .join('');
}

/**
 * Get CSS class for status badge
 */
function getStatusClass(status) {
    if (status === 'OK') return 'ok';
    if (status.includes('Waiting')) return 'waiting';
    if (status === 'Invalid') return 'invalid';
    return 'ok';
}

/**
 * Update statistics display
 */
function updateStats() {
    document.getElementById('scanned-count').textContent = appState.stats.scanned;
    document.getElementById('good-count').textContent = appState.stats.good;
    
    const progressFill = document.getElementById('progress-fill');
    const progressValue = document.getElementById('progress-value');
    
    progressFill.style.width = appState.stats.progress + '%';
    progressValue.textContent = appState.stats.progress + '%';
}

/**
 * Simple HTML escape to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ──────────────────────────────────────────────
// EVENT HANDLERS
// ──────────────────────────────────────────────

/**
 * Handle filter button clicks
 */
function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update filter and re-render
            appState.currentFilter = btn.dataset.filter;
            applyFilter();
        });
    });
}

/**
 * Handle control button clicks
 */
function setupControlButtons() {
    document.getElementById('refresh-btn').addEventListener('click', () => {
        refreshDashboard();
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
        // TODO: Implement settings modal
        console.log('Settings clicked');
    });

    document.getElementById('play-btn').addEventListener('click', () => {
        // TODO: Implement start/resume functionality
        console.log('Play clicked');
    });
}

/**
 * Refresh dashboard data from API
 */
async function refreshDashboard() {
    appState.isLoading = true;
    try {
        const data = await fetchBatteryData();
        updateAppState(data);
    } finally {
        appState.isLoading = false;
    }
}

// ──────────────────────────────────────────────
// INITIALIZATION
// ──────────────────────────────────────────────

/**
 * Initialize the dashboard
 */
async function initDashboard() {
    console.log('Initializing Battery Testing Tray Dashboard');
    
    // Setup event listeners
    setupFilterButtons();
    setupControlButtons();

    // Load initial data
    await refreshDashboard();

    // Optional: Set up auto-refresh (uncomment if desired)
    // setInterval(refreshDashboard, CONFIG.REFRESH_INTERVAL);
    
    console.log('Dashboard initialized');
}

// Start the dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// ──────────────────────────────────────────────
// EXPORT FOR TESTING & COLLEAGUE INTEGRATION
// ──────────────────────────────────────────────

// Make functions available globally for console testing and colleague integration
if (typeof window !== 'undefined') {
    window.DashboardAPI = {
        // Data fetching
        fetchBatteryData,
        submitBatteryData,
        refreshDashboard,
        
        // State access
        getAppState: () => appState,
        getAllData: () => appState.allData,
        getStats: () => appState.stats,
        
        // Configuration
        toggleMockData: (useMock) => {
            CONFIG.USE_MOCK_DATA = useMock;
            refreshDashboard();
        },
        setApiBase: (baseUrl) => {
            CONFIG.API_BASE = baseUrl;
        },
        
        // Utilities
        calculateStats,
        filterData
    };

    console.log('Dashboard API available as window.DashboardAPI');
    console.log('Example usage: DashboardAPI.toggleMockData(false)');
}

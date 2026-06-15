/**
 * Battery Testing Tray Dashboard
 * 
 * This dashboard displays battery test measurements.
 * Currently, uses mock data - ready to be connected to the backend API.
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
    API_BASE: 'http://localhost:8080/api',
    REFRESH_INTERVAL: 5000, // 5 seconds
    // USE_MOCK_DATA: true // Toggle this to switch between mock and real API
};

// ──────────────────────────────────────────────
// MOCK DATA (Sample data matching the image)
// ──────────────────────────────────────────────

/*const MOCK_DATA = [
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
];*/

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
// DATA MAPPING
// Backend row shape:
//  {id, slot_id, nfc_id, voltage, percent, created_at}
//
// Frontend expectations:
//  {nfc_id, voltage, status, scanned, timestamp}
// ──────────────────────────────────────────────

function mapRow(row) {
    const voltage = parseFloat(row.voltage);

    //Determine status from voltage range (should mirror backend / validate logic)
    let status;
    if (!row.nfc_id || row.nfc_id.trim() === '' || row.slot_id === null) {
        status = 'Invalid';
    } else if (voltage < 2.40 || voltage > 3.60) {
        status = 'Invalid';
    } else if (voltage >= 2.40 && voltage <3.00) {
        status = 'Waiting...';
    } else {
        status = 'OK';
    }

    const scanned = status === 'OK' || status === 'Waiting...';

    const timestamp = row.created_at
        ? new Date(row.created_at).toLocaleString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : null;

    return {
        nfc_id: row.nfc_id || row.slot_id || '-',
        slot_id: row.slot_id,
        voltage: isNaN(voltage) ? null : voltage,
        percent: row.percent,
        status,
        scanned,
        timestamp,
    };
}

// ──────────────────────────────────────────────
// API FUNCTIONS
// ──────────────────────────────────────────────

/**
 * Fetch data from the backend API
 * Integration point for your colleague to connect to the real database
 */
async function fetchBatteryData() {
    const response = await fetch(`${CONFIG.API_BASE}/battery`);
    if (!response.ok) throw new Error(`GET /batter failed: ${response.status}`);
    const rows = await response.json();
    return rows.map(mapRow);
}

async function fetchCurrentNfc() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/nfc`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.currentNfc || null;
    } catch {
        return null;
    }
}

/**
 * Submit new battery measurement
 * Call this from the browser console or wire it to a button:
 *  DashboardAPI.submitBatteryData('SLOT-01', 3.55, 87)
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
            const err = await response.json().catch(() => ({}));
            console.error('POST /battery failed:', err.error || response.status);
            return null;
        }

        const data = await response.json();
        console.log('Battery data submitted:', data);
        await refreshDashboard();
        return data;
    } catch (error) {
        console.error('Error submitting battery data:', error);
    }
}

// ──────────────────────────────────────────────
// DATA FILTERING & PROCESSING + Stats
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

function updateNfcIndicator(nfcId) {
    appState.currentNfc = nfcId;
    let indicator = document.getElementById('nfc-indicator');

    //Create indicator the first time
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'nfc-indicator';
        indicator.style.cssText = `
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 1rem;
        `;

        const progressSection = document.querySelector('.progress-section');
        progressSection.parentNode.insertBefore(indicator, progressSection);
    }

    if (nfcId) {
        indicator.textContent = `NFC Activate: ${nfcId}`;
        indicator.style.background = '#e8f5e9';
        indicator.style.color = '#2e7d32';
    } else {
        indicator.textContent = 'Waiting for NFC scan...';
        indicator.style.background = '#fff3e0';
        indicator.style.color = '#e65100';
    }
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
        btn.addEventListener('click', () => {
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
        void refreshDashboard();
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
        // TODO: Implement settings modal
        const url = prompt('API base URL:', CONFIG.API_BASE);
        if (url) {
            CONFIG.API_BASE = url.replace(/\/$/, '');
            void refreshDashboard();
        }
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
    if (appState.isLoading) return;
    appState.isLoading = true;

    try {
        const [data, nfcId] = await Promise.all([
            fetchBatteryData(),
            fetchCurrentNfc()
        ]);

        updateAppState(data);
        updateNfcIndicator(nfcId);

    } catch (err) {
        console.error('Refresh failed:', err);
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
    setInterval(refreshDashboard, CONFIG.REFRESH_INTERVAL);
    
    console.log('Dashboard initialized');
}

// Start the dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    void initDashboard();
}

// ──────────────────────────────────────────────
// EXPORT FOR TESTING & COLLEAGUE INTEGRATION
// ──────────────────────────────────────────────

// Make functions available globally for console testing and colleague integration
if (typeof window !== 'undefined') {
    window.DashboardAPI = {
        // Data fetching
        // fetchBatteryData,
        submitBatteryData,
        refreshDashboard,
        // fetchCurrentNfc,
        
        // State access
        getAppState: () => appState,
        getStats: () => appState.stats,
        
        // Configuration
        setApiBase: (url) => {
            CONFIG.API_BASE = url.replace(/\$/, '');
        },
        
        // Utilities
        // calculateStats,
        // filterData
    };

    console.log('DashboardAPI available — e.g. ' +
        'DashboardAPI.submitBatteryData("SLOT-01", 3.55, 87)');
}

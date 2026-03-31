# TAPP Datalogging

A battery monitoring and datalogging system for TAPP ink chips. This project uses an ESP8266 microcontroller to read battery voltage, calculate percentage, and send data to a Node.js backend API, which stores measurements in a PostgreSQL database. NFC integration allows associating measurements with specific chips.

## How It Works

The system consists of three main components:

1. **Firmware (ESP8266)**: Continuously monitors analog voltage from a connected sensor. Detects chip insertion, stabilizes readings, calculates battery percentage, and sends data to the backend via HTTP POST.
2. **Backend (Node.js/Fastify)**: Provides a REST API for receiving NFC scans and battery measurements. Stores data in PostgreSQL with NFC-chip associations.
3. **NFC Reader (Python)**: Reads NFC tags and sends IDs to the backend for chip identification.

### Data Flow
- NFC reader scans chip and sends ID to `/api/nfc`
- ESP8266 detects chip insertion (voltage > 1.0V)
- ESP8266 takes voltage readings and sends to `/api/battery`
- Backend associates measurement with last scanned NFC ID
- Data is stored in PostgreSQL database
- API endpoints allow fetching logged measurements

## Prerequisites

- **Docker & Docker Compose**: [Install Docker](https://docs.docker.com/get-docker/)
- **Arduino IDE**: [Download here](https://www.arduino.cc/en/software) (for ESP8266 firmware)
- **ESP8266 Board** (e.g., ESP-12 or NodeMCU) with voltage sensor connected to A0 pin
- **NFC Reader Hardware** (optional, for full NFC integration)
- Same WiFi network for ESP8266 and server

## Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/zhichengliangnhl/TAPP_Datalogging.git
   cd TAPP_Datalogging
   ```

2. Ensure Docker is running on your system.

## Running the Program

### Using Docker (Recommended)

1. Start the services:
   ```bash
   docker-compose up --build
   ```
   - Backend runs on `http://localhost:8081`
   - Database runs on `localhost:5433` (internal only)
   - Database is automatically initialized on first run

2. Stop the services:
   ```bash
   docker-compose down
   ```

### Manual Setup (Alternative)

If you prefer not to use Docker:

1. Install Node.js (v18+) and PostgreSQL
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Update `.env` with your database credentials
5. Start server: `node backend/server.js`

### Firmware (ESP8266)

1. Open `firmware/ReadVoltage/ReadVoltage.ino` in Arduino IDE
2. Update WiFi credentials in the code:
   ```cpp
   const char* SSID     = "Your_WiFi_SSID";
   const char* PASSWORD = "Your_WiFi_Password";
   ```
3. Update server URL (use your Docker host IP):
   ```cpp
   http.begin(client, "http://YOUR_HOST_IP:8081/api/battery");
   ```
4. Install ESP8266 board support in Arduino IDE:
   - File → Preferences → Additional Boards Manager URLs
   - Add: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
   - Tools → Board → Boards Manager → Install "ESP8266 by ESP8266 Community"
   - Select board: Tools → Board → NodeMCU 1.0 (ESP-12E Module)
5. Select port and upload the firmware
6. Monitor via Serial (115200 baud)

### NFC Reader (Optional)

1. Ensure Python dependencies are installed (see `requirements.txt`)
2. Run the NFC reader script:
   ```bash
   python backend/nfc_reader.py
   ```
   - This sends NFC scans to the backend API

## API Documentation

### Battery Endpoints
- **POST /api/battery**: Log measurement
  - Body: `{"slot_id": "string", "voltage": float, "percent": int}`
  - Associates with last scanned NFC ID
  - Response: `{"id": int, "created_at": "timestamp", "nfc_id": "string"}`
- **GET /api/battery**: Get last 50 measurements
- **GET /api/battery/validate**: Get invalid measurements (voltage/percent out of range)

### NFC Endpoints
- **POST /api/nfc**: Store NFC scan
  - Body: `{"nfc_id": "string"}`
  - Stores in memory for next battery measurement
- **GET /api/nfc**: Get current stored NFC ID

## Configuration

### Environment Variables (.env)
```
DB_HOST=tapp-db
DB_PORT=5432
DB_USER=postgres
DB_PASS=6767
DB_NAME=tapp_battery
NODE_ENV=development
PORT=8080
```

### Firmware Configuration
- **Voltage Calibration**: Adjust `SCALE_FACTOR`, `OFFSET`, `V_MAX`, `V_MIN` for accurate readings
- **Chip Detection**: `V_CHIP_PRESENT` threshold for insertion/removal
- **WiFi/Server**: Update SSID, PASSWORD, and server URL

### Database Schema
- Automatic initialization via `backend/init-db.js`
- Table: `battery_measurements` with columns for slot_id, nfc_id, voltage, percent, created_at

## Testing

1. Start Docker services: `docker-compose up`
2. Test NFC (optional): POST to `/api/nfc` with test NFC ID
3. Test battery logging: POST to `/api/battery` with sample data
4. Verify data: GET `/api/battery` should return stored measurements
5. Upload firmware to ESP8266 and test with real hardware

Example API calls:
```bash
# Store NFC ID
curl -X POST http://localhost:8081/api/nfc \
  -H "Content-Type: application/json" \
  -d '{"nfc_id":"ABC123"}'

# Log battery measurement
curl -X POST http://localhost:8081/api/battery \
  -H "Content-Type: application/json" \
  -d '{"slot_id":"slot_01","voltage":3.5,"percent":80}'

# Get measurements
curl http://localhost:8081/api/battery
```

## Troubleshooting

- **Docker Issues**: Ensure Docker Desktop is running
- **Port Conflicts**: If 8081/5433 are in use, modify `docker-compose.yml`
- **WiFi Issues**: Verify ESP8266 credentials and network connectivity
- **No Data**: Check server logs with `docker-compose logs`
- **Voltage Calibration**: Use multimeter to verify readings
- **NFC Not Working**: Ensure NFC reader script is running and hardware is connected

## Project Structure

```
TAPP_Datalogging/
├── backend/
│   ├── database.js          # DB connection
│   ├── init-db.js          # Schema setup
│   ├── server.js           # Fastify API server
│   ├── routes/
│   │   └── battery.js      # Battery endpoints
│   ├── nfc_reader.py       # NFC hardware interface
│   └── requirements.txt    # Python dependencies
├── firmware/
│   └── ReadVoltage/
│       └── ReadVoltage.ino # ESP8266 firmware
├── docker-compose.yml      # Docker services
├── Dockerfile             # Backend container
├── .env                   # Environment config
└── README.md
```

## License

ISC License. See repository for details.
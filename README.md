# TAPP Datalogging

A battery monitoring and datalogging system for TAPP ink chips. This project uses an ESP8266 microcontroller to read battery voltage, calculate percentage, and send data to a Node.js backend API, which stores measurements in a PostgreSQL database. NFC integration allows associating measurements with specific chips.

## How It Works

The system consists of three main components:

1. **Firmware (Arduino UNO)**: Continuously monitors analog voltage from a connected sensor. Detects chip insertion and sends the data to backend.
2. **Backend (PostgreSQL, Java)**: Communicates with Aduino board and stores the data in PostgreSQL with NFC-chip associations.
3. **NFC Reader (Java)**: Reads NFC tags and sends IDs to the backend for chip identification.

### Data Flow
- NFC reader scans chip and sends ID to java backend
- Arduino reads the voltage of the battery
- Battery voltage is sent to the backend via COM port
- Backend associates measurement with last scanned NFC ID
- Data is stored in PostgreSQL database
- Dashboard fetches the data and displays it to the user

## Prerequisites

- **Docker & Docker Compose**: [Install Docker](https://docs.docker.com/get-docker/)
- **Arduino IDE**: [Download here](https://www.arduino.cc/en/software) (for ESP8266 firmware)
- **Arduino Uno** with voltage sensor connected to A0 pin
- **NFC Reader Hardware** (optional, for full NFC integration)

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
   - Database runs on `localhost:5432`
   - Database is automatically initialized on startup if the table does not exist
   - This starts the backend and database containers
   - Dashboard runs on `localhost:3001`

2. Stop the services:
   ```bash
   docker-compose down
   ```

3. If you changed database credentials or want a clean database reset:
   ```bash
   docker-compose down -v --remove-orphans
   docker-compose up --build
   ```
   - `-v` removes the PostgreSQL volume so the database is initialized again from the current `.env`

### Manual Setup (Alternative)

If you prefer not to use Docker:

1. Install PostgreSQL
2. Install dependencies: `npm install`
3. Set up PostgreSQL database
4. Update `.env` with your database credentials

### Firmware (Arduino UNO)

1. Open `firmware/ReadVoltage/ReadVoltage.ino` in Arduino IDE
2. Select port and upload the firmware
3. Monitor via Serial (115200 baud)

### NFC Reader and COM port handling

1. Ensure the reader is connected and recognized by your system
2. Run the handling program: 
`offlineDatabaseHandling/SerialCommunication/src/Main.java`
3. Make sure program connects to the correct port. If not, correct port number in line 74

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

### Database Schema
- Automatic initialization via `backend/init-db.js`
- Table: `battery_measurements` with columns for slot_id, nfc_id, voltage, percent, created_at

## Inspecting PostgreSQL In Terminal

You can inspect the database directly from the Docker container with `psql`.

1. Start the stack:
   ```bash
   docker-compose up -d --build
   ```

2. Check that PostgreSQL is ready:
   ```bash
   docker-compose logs tapp-db
   ```
   - Wait for `database system is ready to accept connections`

3. List all tables in the app database:
   ```bash
   docker-compose exec tapp-db psql -U postgres -d tapp_battery -c "\dt"
   ```

4. View the table contents:
   ```bash
   docker-compose exec tapp-db psql -U postgres -d tapp_battery -c "SELECT * FROM battery_measurements;"
   ```

5. Open an interactive PostgreSQL shell:
   ```bash
   docker-compose exec tapp-db psql -U postgres -d tapp_battery
   ```
   - Inside `psql`, use `\dt` to list tables
   - Inside `psql`, use `SELECT * FROM battery_measurements;` to inspect rows

## Troubleshooting

- **Docker Issues**: Ensure Docker Desktop is running
- **Port Conflicts**: If 8080/5432 are in use, modify `docker-compose.yml`
- **No Data**: Check server logs with `docker-compose logs`
- **Voltage Calibration**: Use multimeter to verify readings
- **NFC Not Working**: Ensure NFC reader script is running and hardware is connected

### Bug Fix Notes

During setup, the following issues were identified and fixed:

- The backend and Docker Compose expect `DB_PASS`, not `DB_PASSWORD`
- Docker Compose was not receiving the expected database variables until the environment values were loaded correctly
- The PostgreSQL container user must match the values used in `.env`
- `init-db.js` creates the `battery_measurements` table, but the PostgreSQL container creates the `tapp_battery` database itself
- Running `psql` too early can fail before PostgreSQL is fully ready, so checking `docker-compose logs tapp-db` first helps

Recommended `.env`:

```env
PORT=8080
DB_HOST=tapp-db
DB_PORT=5432
DB_USER=postgres
DB_PASS=6767
DB_NAME=tapp_battery
```

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

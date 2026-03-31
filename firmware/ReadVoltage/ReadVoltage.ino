#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// ── WiFi credentials ─────────────────────────
const char* SSID     = "ZHI";
const char* PASSWORD = "Rninja2341";

// ── Calibration (from multimeter readings 2026-03-27) ────
// Wemos D1 Mini A0 divider: external 150K + onboard 220K/100K
// Linear fit: true = 0.9908 * esp - 0.0108
const float SCALE_FACTOR = 4.674f / 1023.0f;  // volts per ADC count
const float OFFSET       = -0.011f;            // calibration offset

// ── Battery thresholds ───────────────────────
const float V_MAX   = 3.30f;
const float V_MIN   = 2.40f;   // below this -> 0%
const float V_CHIP_PRESENT = 1.0f;

const char* SLOT_ID = "slot_01";

// ── Chip tracking ────────────────────────────
int chipCount = 0;

// ── Helpers ──────────────────────────────────
float readVoltage() {
    long sum = 0;
    for (int i = 0; i < 16; i++) {
        sum += analogRead(A0);
        delay(2);
    }
    return (sum / 16.0f) * SCALE_FACTOR + OFFSET;
}

uint8_t voltageToPercent(float v) {
    if (v >= V_MAX) return 100;
    if (v <= V_MIN) return 0;
    return (uint8_t)((v - V_MIN) / (V_MAX - V_MIN) * 100.0f + 0.5f);
}

// ── WiFi reconnect ───────────────────────────
void ensureWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.print("Reconnecting WiFi");
    WiFi.disconnect();
    WiFi.begin(SSID, PASSWORD);

    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 20) {
        delay(500);
        Serial.print(".");
        tries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\nConnected. IP: %s\n",
                      WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\nWiFi reconnect failed");
    }
}

// ── Backend Send ─────────────────────────────
void dbSend(float voltage, uint8_t percent) {
    ensureWiFi();

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected - Skipping DB Send");
        return;
    }

    WiFiClient client;
    HTTPClient http;

    http.begin(client, "http://ZhiBook:8080/api/battery");
    http.addHeader("Content-Type", "application/json");

    char payload[128];
    snprintf(payload, sizeof(payload),
             "{\"slot_id\":\"%s\",\"voltage\":%.3f,\"percent\":%d}",
             SLOT_ID, voltage, percent);

    Serial.print("Sending: ");
    Serial.println(payload);

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        Serial.printf("HTTP Response: %d\n", httpCode);
    } else {
        Serial.printf("HTTP POST failed: %s\n",
                      http.errorToString(httpCode).c_str());
    }

    http.end();
}

// ── Setup ────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n=== TAPP Ink Battery Monitor ===");

    WiFi.mode(WIFI_STA);
    WiFi.begin(SSID, PASSWORD);

    Serial.print("Connecting to WiFi");
    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
        delay(500);
        Serial.print(".");
        tries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\nConnected. IP: %s\n",
                      WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\nWiFi failed - continuing without backend");
    }
}

// ── Loop ─────────────────────────────────────
void loop() {
    static bool chipLocked = false;

    float rawVoltage = readVoltage();
    bool present = rawVoltage >= V_CHIP_PRESENT;

    // Chip removed -> unlock
    if (!present && chipLocked) {
        chipLocked = false;
        Serial.println("Chip removed. Ready for next chip.");
        delay(300);
        return;
    }

    // No chip
    if (!present) {
        delay(300);
        return;
    }

    // Already processed
    if (chipLocked) {
        delay(300);
        return;
    }

    // ── Take 10 readings ──
    float readings[10];
    Serial.println("Measuring voltage...");

    for (int i = 0; i < 10; i++) {
        readings[i] = readVoltage();
        Serial.printf("Reading %d: %.3f V\n", i + 1, readings[i]);
        delay(100);
    }

    // ── Sort (bubble sort for median) ──
    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 10; j++) {
            if (readings[j] < readings[i]) {
                float temp = readings[i];
                readings[i] = readings[j];
                readings[j] = temp;
            }
        }
    }

    // ── Median of middle two ──
    float medianVoltage = (readings[4] + readings[5]) / 2.0f;
    uint8_t percent = voltageToPercent(medianVoltage);

    chipCount++;
    Serial.printf("\n[STORED #%d] MEDIAN: %.3f V  %d%%\n",
                  chipCount, medianVoltage, percent);

    dbSend(medianVoltage, percent);

    Serial.println("REMOVE CHIP");
    chipLocked = true;

    delay(300);
}
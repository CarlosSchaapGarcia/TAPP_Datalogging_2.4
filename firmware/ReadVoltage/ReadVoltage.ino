#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// ── WiFi credentials ─────────────────────────
const char* SSID     = "Tete's";
const char* PASSWORD = "Tete2480";
// ── Calibration ──────────────────────────────
const float V_SCALE = 4.069f;
const float V_MAX   = 3.60f;
const float V_MIN   = 2.40f;  // Low-voltage threshold (±0.2V tolerance). Below this → 0%.
const float V_CHIP_PRESENT = 1.0f;
const char* SLOT_ID = "slot_01";


// ── Chip tracking ────────────────────────────
int  chipCount   = 0;
bool chipPresent = false;

// ── Helpers ──────────────────────────────────
float readVoltage() {
    long sum = 0;
    for (int i = 0; i < 16; i++) {
        sum += analogRead(A0);
        delay(2);
    }
    return (sum / 16.0f) / 1023.0f * V_SCALE;
}

uint8_t voltageToPercent(float v) {
    if (v >= V_MAX) return 100;
    if (v <= V_MIN) return 0;
    return (uint8_t)((v - V_MIN) / (V_MAX - V_MIN) * 100.0f + 0.5f);
}

// ── Backend Send ─────────────────────────────
void dbSend(int chip_num, float voltage, uint8_t percent) {

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected - Skipping DB Send");
        return;
    }

    WiFiClient client;
    HTTPClient http;

    String serverUrl = "http://172.21.83.194:8080/api/battery";

    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"device_id\":\"station_01\",";
    payload += "\"chip_number\":" + String(chip_num) + ",";
    payload += "\"voltage\":" + String(voltage, 3) + ",";
    payload += "\"percent\":" + String(percent) + ",";
    payload += "\"slot_id\":\"" + String(SLOT_ID) + "\"";
    payload += "}";

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        Serial.printf("HTTP Response Code: %d\n", httpCode);
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
unsigned long lastPrint = 0;

void loop() {

    static bool chipLocked = false;

    float rawVoltage = readVoltage();
    bool present = rawVoltage >= V_CHIP_PRESENT;

    // If chip removed → reset
    if (!present && chipLocked) {
        chipLocked = false;
        Serial.println("Chip removed. Ready for next chip.");
        delay(300);
        return;
    }

    // No chip present
    if (!present) {
        delay(300);
        return;
    }

    // Already processed this chip
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

    // ── Sort readings (simple bubble sort) ──
    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 10; j++) {
            if (readings[j] < readings[i]) {
                float temp = readings[i];
                readings[i] = readings[j];
                readings[j] = temp;
            }
        }
    }

    // ── Median (average of middle two values) ──
    float medianVoltage = (readings[4] + readings[5]) / 2.0;

    uint8_t percent = voltageToPercent(medianVoltage);

    chipCount++;

    Serial.printf("\n[STORED #%d] MEDIAN: %.3f V  %d%%\n",
                  chipCount, medianVoltage, percent);

    dbSend(chipCount, medianVoltage, percent);

    Serial.println("REMOVE CHIP");

    chipLocked = true;

    delay(300);
}
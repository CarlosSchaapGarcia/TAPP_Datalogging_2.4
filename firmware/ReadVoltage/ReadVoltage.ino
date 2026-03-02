#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// ── WiFi credentials ─────────────────────────
const char* SSID     = "Ziggo3884195";
const char* PASSWORD = "5kk7ccMrshjdsapa";

// ── Calibration ──────────────────────────────
const float V_SCALE = 4.069f;
const float V_MAX   = 3.60f;
const float V_MIN   = 2.40f;
const float V_CHIP_PRESENT = 1.0f;

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

    String serverUrl = "http://Zhi:8080/api/battery";

    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"device_id\":\"station_01\",";
    payload += "\"chip_number\":" + String(chip_num) + ",";
    payload += "\"voltage\":" + String(voltage, 3) + ",";
    payload += "\"percent\":" + String(percent);
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

    unsigned long now = millis();
    if (now - lastPrint < 500) return;
    lastPrint = now;

    float v = readVoltage();
    bool present = v >= V_CHIP_PRESENT;

    if (present && !chipPresent) {
        chipPresent = true;
        chipCount++;

        uint8_t percent = voltageToPercent(v);

        Serial.printf("[CHIP #%d] %.3f V  %d%%\n",
                      chipCount, v, percent);

        dbSend(chipCount, v, percent);
    }

    else if (present) {
        Serial.printf("  %.3f V  %d%%\n",
                      v, voltageToPercent(v));
    }

    else if (!present && chipPresent) {
        chipPresent = false;
        Serial.println("[REMOVED]");
    }
}
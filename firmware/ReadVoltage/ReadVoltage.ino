#include <Arduino.h>
#include <Servo.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

// WiFi credentials
const char* SSID = "CARLOS";
const char* PASSWORD = "Rninja2341";

// Backend endpoint. Use the IP address of the PC running Docker/backend.
// Do not use localhost here; on the ESP8266, localhost means the ESP8266 itself.
const char* BATTERY_API_URL = "http://192.168.137.1:8080/api/battery";

// Servo pins for ESP8266/Wemos D1 Mini style boards.
// Rewire the arm servo to D5 and the sorting servo to D6, or change these pins.
const int SERVO_PIN = D5;
const int SORT_SERVO_PIN = D6;

Servo armServo;
Servo sortServo;

const int ARM_UP_POS = 180;
const int ARM_DOWN_POS = 80;

const int BOARD_FLAT = 90;
const int BOARD_RIGHT = 180;
const int BOARD_LEFT = 0;

// ESP8266 voltage calibration from the previous WiFi sketch.
const float SCALE_FACTOR = 4.674f / 1023.0f;
const float OFFSET = -0.011f;

const float V_MAX = 3.30f;
const float V_MIN = 2.40f;
const float VOLTAGE_THRESHOLD = 2.80f;
const float CONTACT_THRESHOLD = 1.0f;

const int SORT_HOLD_DELAY = 1000;
const int CYCLE_PAUSE = 500;
const int CONTACT_TIMEOUT = 65000;

const char* SLOT_ID = "slot_01";
int chipCount = 0;

void ensureWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        return;
    }

    Serial.print("Connecting to WiFi");
    WiFi.disconnect();
    WiFi.mode(WIFI_STA);
    WiFi.begin(SSID, PASSWORD);

    int tries = 0;
    while (WiFi.status() != WL_CONNECTED && tries < 30) {
        delay(500);
        Serial.print(".");
        tries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\nWiFi connected. IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\nWiFi connection failed");
    }
}

float readVoltage() {
    long sum = 0;

    for (int i = 0; i < 16; i++) {
        sum += analogRead(A0);
        delay(2);
    }

    return (sum / 16.0f) * SCALE_FACTOR + OFFSET;
}

uint8_t voltageToPercent(float voltage) {
    if (voltage >= V_MAX) {
        return 100;
    }
    if (voltage <= V_MIN) {
        return 0;
    }
    return (uint8_t)((voltage - V_MIN) / (V_MAX - V_MIN) * 100.0f + 0.5f);
}

bool waitForContact() {
    Serial.println("Waiting for contact...");
    unsigned long startTime = millis();

    while (millis() - startTime < CONTACT_TIMEOUT) {
        float check = readVoltage();

        if (check >= CONTACT_THRESHOLD) {
            Serial.println("Contact detected");
            return true;
        }

        delay(200);
    }

    Serial.println("Timeout - no contact detected, treating as rejected");
    return false;
}

bool sendBatteryMeasurement(float voltage, uint8_t percent) {
    ensureWiFi();

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected - skipping backend send");
        return false;
    }

    WiFiClient client;
    HTTPClient http;

    if (!http.begin(client, BATTERY_API_URL)) {
        Serial.println("Could not start HTTP request");
        return false;
    }

    http.addHeader("Content-Type", "application/json");

    char payload[128];
    snprintf(
        payload,
        sizeof(payload),
        "{\"slot_id\":\"%s\",\"voltage\":%.3f,\"percent\":%d}",
        SLOT_ID,
        voltage,
        percent
    );

    Serial.print("Sending to backend: ");
    Serial.println(payload);

    int httpCode = http.POST(payload);
    String response = http.getString();

    if (httpCode > 0) {
        Serial.printf("Backend response: %d %s\n", httpCode, response.c_str());
    } else {
        Serial.printf("HTTP POST failed: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
    return httpCode >= 200 && httpCode < 300;
}

void setup() {
    Serial.begin(115200);
    delay(200);

    Serial.println();
    Serial.println("=== TAPP ESP8266 Battery Monitor ===");

    ensureWiFi();

    armServo.attach(SERVO_PIN);
    Serial.println("Arm up");
    armServo.write(ARM_UP_POS);
    delay(2000);

    sortServo.attach(SORT_SERVO_PIN);
    sortServo.write(BOARD_FLAT);
    Serial.println("Sorting servo ready");
    delay(500);
}

void loop() {
    float readings[10];

    Serial.println();
    Serial.println("Lowering arm...");
    armServo.write(ARM_DOWN_POS);
    delay(2000);

    if (!waitForContact()) {
        Serial.println("REJECTED - turning left");
        sortServo.write(BOARD_LEFT);

        delay(SORT_HOLD_DELAY);
        Serial.println("Resetting to flat");

        sortServo.write(BOARD_FLAT);
        armServo.write(ARM_UP_POS);

        delay(2000);
        return;
    }

    Serial.println("Measuring voltage...");

    for (int i = 0; i < 10; i++) {
        readings[i] = readVoltage();
        Serial.printf("Reading %d: %.3f V\n", i + 1, readings[i]);
        delay(100);
    }

    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 10; j++) {
            if (readings[j] < readings[i]) {
                float temp = readings[i];
                readings[i] = readings[j];
                readings[j] = temp;
            }
        }
    }

    float medianVoltage = (readings[4] + readings[5]) / 2.0f;
    uint8_t percent = voltageToPercent(medianVoltage);

    chipCount++;
    Serial.printf("Median Voltage: %.3f V\n", medianVoltage);
    Serial.printf("Percent: %d%%\n", percent);

    bool stored = sendBatteryMeasurement(medianVoltage, percent);
    if (stored) {
        Serial.printf("Stored measurement #%d\n", chipCount);
    } else {
        Serial.println("Measurement was not stored");
    }

    Serial.println("Raising arm...");
    armServo.write(ARM_UP_POS);
    delay(2000);

    if (medianVoltage >= VOLTAGE_THRESHOLD) {
        Serial.println("GOOD - turning right");
        sortServo.write(BOARD_RIGHT);
    } else {
        Serial.println("REJECTED - turning left");
        sortServo.write(BOARD_LEFT);
    }

    delay(SORT_HOLD_DELAY);

    Serial.println("Resetting to flat");
    sortServo.write(BOARD_FLAT);
    delay(CYCLE_PAUSE);

    Serial.println("STOP SCANNING");
    Serial.println("-----------------------------");

    delay(3000);
}

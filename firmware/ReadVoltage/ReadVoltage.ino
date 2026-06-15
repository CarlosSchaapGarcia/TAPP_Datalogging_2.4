#include <Servo.h>

// ── SERVO ─────────────────────────────────────
Servo armServo;

const int SERVO_PIN = 9;

// Adjust these once you know your real angles
const int ARM_UP_POS = 180;
const int ARM_DOWN_POS = 90;

// ── VOLTAGE ───────────────────────────────────
const int VOLTAGE_PIN = A0;
const float SCALE_FACTOR = 5.0f / 1023.0f;

// ── READ VOLTAGE ─────────────────────────────
float readVoltage() {
    long sum = 0;

    for (int i = 0; i < 16; i++) {
        sum += analogRead(VOLTAGE_PIN);
        delay(2);
    }

    float adc = sum / 16.0;
    return adc * SCALE_FACTOR;
}

// ── SETUP ─────────────────────────────────────
void setup() {
    Serial.begin(115200);

    Serial.println("=== TAPP Ink Battery Monitor ===");

    armServo.attach(SERVO_PIN);

    Serial.println("Arm UP (initial)");
    armServo.write(ARM_UP_POS);
    delay(2000);
}

// ── LOOP ──────────────────────────────────────
void loop() {

    float readings[10];

    // ── Move arm DOWN before measuring ──
    Serial.println("\nLowering arm...");
    armServo.write(ARM_DOWN_POS);
    delay(2000); // give time to touch battery

    // Wait until contact is stable
    float check = readVoltage();

    if (check < 2.8) {
        Serial.println("No battery contact detected - skipping");
        return;
    }
    Serial.println("Measuring voltage...");

    // ── Take 10 readings ──
    for (int i = 0; i < 10; i++) {

        readings[i] = readVoltage();

        Serial.print("Reading ");
        Serial.print(i + 1);
        Serial.print(": ");
        Serial.print(readings[i], 3);
        Serial.println(" V");

        delay(100);
    }

    // ── Sort readings ──
    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 10; j++) {

            if (readings[j] < readings[i]) {
                float temp = readings[i];
                readings[i] = readings[j];
                readings[j] = temp;
            }
        }
    }

    // ── Median ──
    float medianVoltage = (readings[4] + readings[5]) / 2.0;

    Serial.println();
    Serial.print("Median Voltage: ");
    Serial.print(medianVoltage, 3);
    Serial.println(" V");

    // ── Move arm UP after measurement ──
    Serial.println("Raising arm...");
    armServo.write(ARM_UP_POS);
    delay(2000);

    Serial.println("-----------------------------");

    delay(3000);
}
#include <Servo.h>

// ── SERVO 1 (arm) ─────────────────────────────────────
Servo armServo;
const int SERVO_PIN = 9;

// Adjust these once you know your real angles
const int ARM_UP_POS = 180;
const int ARM_DOWN_POS = 80;

// ── SERVO 2 (sorting board) ───────────────────────────
Servo sortServo;
const int SORT_SERVO_PIN = 6;
const int BOARD_FLAT     = 90;   // Inital flat position (good inlay path)
const int BOARD_RIGHT    = 180;  // Turn 90 degree (good)
const int BOARD_LEFT     = 0; // Turn 90 to the left (need to be tested)

// ── VOLTAGE ───────────────────────────────────
const int VOLTAGE_PIN = A0;
const float SCALE_FACTOR = 5.0f / 1023.0f;
const float VOLTAGE_THRESHOLD = 2.8;  // Volts - below this = rejected

// ── TIMING ───────────────────────────────────
const int SORT_HOLD_DELAY = 1000;    // Time to hold position before resetting
const int CYCLE_PAUSE     = 500;     // Pase before next cycle

// ── RESTARTING / EMERGENCY STOP ──────────────────
void (* resetFunc)(void) = 0;       // Jump to address 0 = soft restart

// ── CHECK FOR STOP COMMAND ────────────────────────────
void checkForStop(){
    if (Serial.available() > 0) {
        String input = Serial.readStringUntil('\n');
        input.trim();
        if (input.equalsIgnoreCase("stop")) {
            Serial.println("Stop command received - restarting...");
            delay(1000);
            resetFunc();
        }
    }
}

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

    // Servo 1
    armServo.attach(SERVO_PIN);

    Serial.println("Arm UP (initial)");
    armServo.write(ARM_UP_POS);
    delay(2000);

    // Servo 2
    sortServo.attach(SORT_SERVO_PIN);
    sortServo.write(BOARD_FLAT);
    Serial.println("Sorting servo ready.");
    delay(500);
}

// ── LOOP ──────────────────────────────────────
void loop() {

    float readings[10];

    // ── Move arm DOWN before measuring ──
    Serial.println("\nLowering arm...");
    armServo.write(ARM_DOWN_POS);
    delay(2000); // give time to touch battery

    checkForStop();

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
        
        checkForStop();
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

    checkForStop();

    // ── Move arm UP after measurement ──
    Serial.println("Raising arm...");
    armServo.write(ARM_UP_POS);
    delay(2000);

    // ── Sort decision ──
    if (medianVoltage >= VOLTAGE_THRESHOLD) {
        Serial.println("GOOD - turning right to 90 degree.");
        sortServo.write(BOARD_RIGHT);
    } else {
        Serial.println("REJECTED - turning left to 270 degrees.");
        sortServo.write(BOARD_LEFT);
    }

    delay(SORT_HOLD_DELAY);

    checkForStop();

    Serial.println("Resetting to flat.");
    sortServo.write(BOARD_FLAT);
    delay(CYCLE_PAUSE);

    Serial.println("STOP SCANNING");

    Serial.println("-----------------------------");

    delay(3000);
}
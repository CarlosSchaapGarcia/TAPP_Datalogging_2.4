#include <Servo.h>

// ── SERVO 2 (sorting board) ──────────────────────────────
Servo sortServo;
const int SORT_SERVO_PIN = 6;
const int BOARD_FLAT     = 0;
const int BOARD_RIGHT    = 90;
const int BOARD_LEFT     = 270;

// ── VOLTAGE ──────────────────────────────────────────────
const int   VOLTAGE_PIN       = A0;
const float SCALE_FACTOR      = 5.0f / 1023.0f;
const float VOLTAGE_THRESHOLD = 3.0;

// ── TIMING ───────────────────────────────────────────────
const int SORT_HOLD_DELAY = 1000;
const int CYCLE_PAUSE     = 500;

// ── VOLTAGE READER ───────────────────────────────────────
float readVoltage() {
    long sum = 0;
    for (int i = 0; i < 16; i++) {
    sum += analogRead(VOLTAGE_PIN);
    delay(2);
}
    float adc = sum / 16.0;
    return adc * SCALE_FACTOR;
}

// ── SETUP ────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    sortServo.attach(SORT_SERVO_PIN);
    sortServo.write(BOARD_FLAT);
    Serial.println("Sorting servo ready.");
    delay(500);
}

// ── LOOP ─────────────────────────────────────────────────
void loop() {
    float voltage = readVoltage();

    Serial.print("Voltage: ");
    Serial.print(voltage, 3);
    Serial.println(" V");

    if (voltage >= VOLTAGE_THRESHOLD) {
    Serial.println("GOOD - turning right to 90°.");
    sortServo.write(BOARD_RIGHT);
} else {
    Serial.println("REJECTED - turning left to 270°.");
    sortServo.write(BOARD_LEFT);
}

    delay(SORT_HOLD_DELAY);

    Serial.println("Resetting to flat.");
    sortServo.write(BOARD_FLAT);
    delay(CYCLE_PAUSE);
}
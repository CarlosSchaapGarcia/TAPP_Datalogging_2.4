from smartcard.System import readers
import requests
import time

API_URL = "http://localhost:8080/api/nfc"

print("Looking for NFC reader...")

r = readers()

if not r:
    print("No NFC reader found")
    exit()

reader = r[0]
print(f"✅ Using reader: {reader}")

connection = reader.createConnection()

last_uid = None

while True:
    try:
        connection.connect()

        data, sw1, sw2 = connection.transmit([0xFF, 0xCA, 0x00, 0x00, 0x00])
        uid = ''.join(format(x, '02X') for x in data)

        if uid != last_uid:
            print(f"NFC Detected: {uid}")

            requests.post(API_URL, json={"nfc_id": uid})
            print("Sent to backend")

            last_uid = uid

        time.sleep(1)

    except Exception:
        last_uid = None
        time.sleep(1)
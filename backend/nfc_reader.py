import os
import time

import requests
from smartcard.System import readers

API_URL = os.getenv("NFC_API_URL", "http://localhost:8080/api/nfc")
POLL_INTERVAL = float(os.getenv("NFC_POLL_INTERVAL", "1"))
REQUEST_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}

print(f"Looking for NFC reader and sending scans to {API_URL}...")

r = readers()

if not r:
    print("No NFC reader found")
    raise SystemExit(1)

reader = r[0]
print(f"Using reader: {reader}")

connection = reader.createConnection()
last_uid = None

while True:
    try:
        connection.connect()

        data, sw1, sw2 = connection.transmit([0xFF, 0xCA, 0x00, 0x00, 0x00])
        uid = "".join(format(x, "02X") for x in data)

        if uid != last_uid:
            print(f"NFC detected: {uid}")

            response = requests.post(
                API_URL,
                json={"nfc_id": uid},
                headers=REQUEST_HEADERS,
                timeout=5,
            )
            response.raise_for_status()
            print(f"Sent to backend: {response.status_code} {response.text}")

            last_uid = uid

        time.sleep(POLL_INTERVAL)

    except Exception as error:
        print(f"NFC read/send error: {error}")
        last_uid = None
        time.sleep(POLL_INTERVAL)
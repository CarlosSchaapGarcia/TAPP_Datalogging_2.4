from smartcard.System import readers
import requests
import time

API_URL = "http://localhost:8080/api/nfc"
REQUEST_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}

print("Looking for NFC reader...")

r = readers()

if not r:
    print("No NFC reader found")
    exit()

reader = r[0]
print(f"Using reader: {reader}")

connection = reader.createConnection()

last_uid = None

while True:
    try:
        connection.connect()

        data, sw1, sw2 = connection.transmit([0xFF, 0xCA, 0x00, 0x00, 0x00])
        uid = ''.join(format(x, '02X') for x in data)

        if uid != last_uid:
            print(f"NFC Detected: {uid}")

            response = requests.post(
                API_URL,
                json={"nfc_id": uid},
                headers=REQUEST_HEADERS,
                timeout=5,
            )
            response.raise_for_status()
            print(f"Sent to backend: {response.status_code} {response.text}")

            last_uid = uid

        time.sleep(1)

    except Exception as error:
        print(f"NFC read/send error: {error}")
        last_uid = None
        time.sleep(1)

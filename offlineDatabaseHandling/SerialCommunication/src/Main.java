import com.fazecast.jSerialComm.SerialPort;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import javax.smartcardio.*;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.List;
import java.time.LocalDateTime;

public class Main {

    public static String readNfcId() throws CardException {
        // Get available terminals (NFC readers)
        TerminalFactory factory = TerminalFactory.getDefault();
        List<CardTerminal> terminals = factory.terminals().list();

        if (terminals.isEmpty()) {
            throw new CardException("No NFC readers found.");
        }

        CardTerminal terminal = terminals.get(0); // Use first reader

        System.out.println("Waiting for NFC tag...");
        // Wait up to 10 seconds for a card to be placed
        terminal.waitForCardPresent(10000);

        // Connect to the card
        Card card = terminal.connect("*");
        CardChannel channel = card.getBasicChannel();

        // Send GET UID APDU command
        byte[] getUidApdu = {(byte)0xFF, (byte)0xCA, 0x00, 0x00, 0x00};
        ResponseAPDU response = channel.transmit(new CommandAPDU(getUidApdu));

        // Check success (SW1=0x90, SW2=0x00)
        if (response.getSW() != 0x9000) {
            throw new CardException("Failed to read UID. SW: " + Integer.toHexString(response.getSW()));
        }

        // Convert UID bytes to hex string
        byte[] uid = response.getData();
        StringBuilder sb = new StringBuilder();
        for (byte b : uid) {
            sb.append(String.format("%02X", b));
        }

        card.disconnect(false);
        return sb.toString(); // e.g. "04A3B2C1"
    }

    public static void main(String[] args) throws Exception {

        // Database credentials, set to correct one
        final String DB_URL = "jdbc:postgresql://localhost:5432/tapp_battery";
        final String USERNAME = "postgres";
        final String PASSWORD = "6767";

        Connection db = DriverManager.getConnection(DB_URL, USERNAME, PASSWORD);

        // Find and open port
        SerialPort[] ports = SerialPort.getCommPorts();
        if (ports.length == 0) {
            System.out.println("No serial ports found.");
            return;
        }

        // Print available ports
        for (int i = 0; i < ports.length; i++) {
            System.out.println(i + ": " + ports[i].getSystemPortName());
        }

        SerialPort port = ports[2]; // change index if needed
        port.setBaudRate(115200);
        port.setComPortTimeouts(
                SerialPort.TIMEOUT_READ_SEMI_BLOCKING, 0, 0 // waits indefinitely for data
        );

        if (!port.openPort()) {
            System.out.println("Failed to open port.");
            return;
        }

        System.out.println("Monitoring " + port.getSystemPortName() + " — press Ctrl+C to stop.\n");

        // Close port cleanly on exit
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\nClosing port...");
            port.closePort();
        }));

        // Continuously read lines, blocking when no data is available
        BufferedReader reader = new BufferedReader(new InputStreamReader(port.getInputStream()));
        String line;
        while ((line = reader.readLine()) != null) {
            line = line.trim();
            if (line.isEmpty()) continue;

            double voltage = Double.parseDouble(line);

            String inlayID = readNfcId();

            System.out.println(inlayID);
            System.out.println(voltage); // print raw, like a serial monitor

            PreparedStatement st = db.prepareStatement("INSERT INTO \"BatteryVoltage\" " +
                    "(67, \"nfc_id\", \"voltage\", \"created_at\") VALUES (?, ?, ?)");
            st.setString(1, inlayID);
            st.setDouble(2, voltage);
            st.setTimestamp(3, Timestamp.valueOf(LocalDateTime.now()));
            st.executeUpdate();
            st.close();

            // Optional: try to parse as a number
            try {
                double number = Double.parseDouble(line);
                // do something with number here
            } catch (NumberFormatException ignored) {}
        }
    }
}
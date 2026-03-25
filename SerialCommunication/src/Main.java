import com.fazecast.jSerialComm.SerialPort;
import java.io.InputStream;
import java.sql.*;
import java.time.LocalDateTime;

public class Main
{
    public static void main(String[] args) throws SQLException
    {
        // Set the CommPort to the one connected to arduino
        SerialPort COM_PORT = SerialPort.getCommPort("COM6");
        COM_PORT.setBaudRate(9600);

        // Database credentials, set to correct one
        final String DB_URL = "jdbc:postgresql://localhost:5432/tapp_db";
        final String USERNAME = "user";
        final String PASSWORD = "qwerty";

        char commChar = 0;

        // Connection to database
        Connection db = DriverManager.getConnection(DB_URL, USERNAME, PASSWORD);

        // If port fails to open
        if (!COM_PORT.openPort()) {
            System.out.println("Failed to open port");
            return;
        }

        System.out.println("Port opened");

        InputStream in = COM_PORT.getInputStream();

        try {
            // Runs constantly
            while (true) {
                StringBuilder voltageStringBuilder = new StringBuilder();
                double voltage = -1;

                // Reads characters from COM port one by one and stores them as a string
                while (in.available() > 0) {
                    int data = in.read();
                    commChar = (char) data;
                    voltageStringBuilder.append(commChar);
                }

                // Converts a string to a double
                if (!voltageStringBuilder.isEmpty())
                {
                    String voltageString = voltageStringBuilder.toString();
                    voltage = Double.parseDouble(voltageString);
                }

                // Sends a query to the database
                if (voltage != -1)
                {
                    System.out.println(voltage);
                    PreparedStatement st = db.prepareStatement("INSERT INTO \"BatteryVoltage\" " +
                            "(\"chipID\", \"dateTime\", \"voltage\") VALUES (?, ?, ?)");
                    st.setString(1, "1111");
                    st.setTimestamp(2, Timestamp.valueOf(LocalDateTime.now()));
                    st.setDouble(3, voltage);
                    st.executeUpdate();
                    st.close();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        COM_PORT.closePort();
    }
}
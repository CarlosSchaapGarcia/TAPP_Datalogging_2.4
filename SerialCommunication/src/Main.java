import com.fazecast.jSerialComm.SerialPort;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.*;


public class Main
{
    public static void main(String[] args) throws SQLException
    {
        // Set the CommPort to the one connected to arduino
        SerialPort COM_PORT = SerialPort.getCommPort("COM6");
        COM_PORT.setBaudRate(9600);
        final String DB_URL = "jdbc:postgresql://localhost:5432/tapp_db";
        final String USERNAME = "user";
        final String PASSWORD = "qwerty";

        Connection db = DriverManager.getConnection(DB_URL, USERNAME, PASSWORD);

        if (!COM_PORT.openPort()) {
            System.out.println("Failed to open port");
            return;
        }

        System.out.println("Port opened");

        InputStream in = COM_PORT.getInputStream();
        BufferedReader reader = new BufferedReader(new InputStreamReader(in));

        try {
            while (true) {
                while (in.available() > 0) {
                    int data = in.read();
                    char c = (char) data;
                    System.out.println(c);
                    PreparedStatement st = db.prepareStatement("INSERT INTO \"BatteryVoltage\" " +
                                                                    "(\"chipID\", \"voltage\") VALUES (?, ?)");
                    st.setString(1, "1111");
                    st.setDouble(2, c);
                    st.executeQuery();
                    st.close();

                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        COM_PORT.closePort();
    }
}
import com.fazecast.jSerialComm.SerialPort;
import java.io.InputStream;

public class Main
{
    public static void main(String[] args)
    {
        SerialPort port = SerialPort.getCommPort("COM7");
        port.setBaudRate(9600);

        if (!port.openPort()) {
            System.out.println("Failed to open port");
            return;
        }

        System.out.println("Port opened");

        InputStream in = port.getInputStream();

        try {
            while (true) {
                while (in.available() > 0) {
                    int data = in.read();
                    System.out.print((char) data);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        port.closePort();
    }
}
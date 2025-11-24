package client;

import com.zeroc.Ice.*;
import Demo.*;
import javax.sound.sampled.AudioFormat;
import javax.swing.*;

public class AudioClient {
    public static String userId;
    public static SubjectPrx subject;
    public static boolean startStreaming = false;

    public static void main(String[] args) throws java.lang.Exception {
        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);

        // Inicializamos el reproductor
        PlayerThread playerThread = new PlayerThread(format);
        ObserverI.player = playerThread;
        playerThread.setPlay(true);
        playerThread.start();

        Communicator communicator = Util.initialize(args);

        ObjectAdapter adapter =
            communicator.createObjectAdapterWithEndpoints("CallbackAdapter", "default");

        ObserverI observer = new ObserverI();
        ObjectPrx base = adapter.addWithUUID(observer);
        ObserverPrx observerPrx = ObserverPrx.uncheckedCast(base);

        adapter.activate();

        ObjectPrx serviceBase = communicator.stringToProxy("AudioService:ws -h localhost -p 9099");
        subject = SubjectPrx.checkedCast(serviceBase); // <-- corregido para asignar la variable estática

        userId = JOptionPane.showInputDialog("User ID:");
        String target = JOptionPane.showInputDialog("¿A quién quieres llamar?");
        subject.startCall(userId, target);

        subject.attach(userId, observerPrx);

        // Inicializamos el sender
        Sender sender = new Sender(userId, subject);
        sender.start();

        System.out.println("[CLIENT] Conectado como " + userId);

        communicator.waitForShutdown();
    }
}

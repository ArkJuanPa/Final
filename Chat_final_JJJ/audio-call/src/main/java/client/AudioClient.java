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

        // Inicializamos el reproductor (debes tener PlayerThread implementado)
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
        subject = SubjectPrx.checkedCast(serviceBase);

        if (subject == null) {
            System.err.println("[CLIENT] No se pudo obtener SubjectPrx. Revisar conexión.");
            communicator.destroy();
            return;
        }

        userId = JOptionPane.showInputDialog("User ID:");
        if (userId == null || userId.trim().isEmpty()) {
            System.err.println("[CLIENT] User ID inválido.");
            communicator.destroy();
            return;
        }

        // adjuntamos el callback ANTES de iniciar llamadas para que el servidor pueda notificarnos
        subject.attach(userId, observerPrx);

        String target = JOptionPane.showInputDialog("¿A quién quieres llamar? (dejar vacío si solo quieres escuchar)");
        if (target != null && !target.trim().isEmpty()) {
            subject.startCall(userId, target);
        }

        // Inicializamos el sender (debes tener la clase Sender implementada)
        Sender sender = new Sender(userId, subject);
        sender.start();

        System.out.println("[CLIENT] Conectado como " + userId);

        communicator.waitForShutdown();
    }
}

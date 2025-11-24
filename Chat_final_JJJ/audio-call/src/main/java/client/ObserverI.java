package client;

import Demo.*;
import javax.swing.JOptionPane;
import com.zeroc.Ice.Current;

public class ObserverI implements Observer {

    public static PlayerThread player;

    @Override
    public void receiveAudio(byte[] data, Current c) {
        if (player != null) player.play(data);
    }

    @Override
    public void receiveAudioMessage(byte[] data, Current c) {
        System.out.println("[CLIENT] Mensaje de audio recibido");
        if (player != null) player.play(data);
    }

    @Override
    public void incomingCall(String fromUser, Current c) {
        int r = JOptionPane.showConfirmDialog(null,
                fromUser + " te está llamando",
                "Llamada entrante",
                JOptionPane.YES_NO_OPTION);

        if (r == JOptionPane.YES_OPTION) {
            AudioClient.subject.acceptCall(fromUser, AudioClient.userId);
            AudioClient.startStreaming = true;
        } else {
            AudioClient.subject.rejectCall(fromUser, AudioClient.userId);
        }
    }

    @Override
    public void callAccepted(String fromUser, Current c) {
        JOptionPane.showMessageDialog(null, fromUser + " aceptó tu llamada");
        AudioClient.startStreaming = true;
    }

    @Override
    public void callColgada(String fromUser, Current c) {
        JOptionPane.showMessageDialog(null, fromUser + " colgo la llamada");
        AudioClient.subject.colgar(fromUser, AudioClient.userId);
        player.setPlay(false);
    }

    @Override
    public void callRejected(String fromUser, Current c) {
        JOptionPane.showMessageDialog(null, fromUser + " rechazó tu llamada");
    }
}

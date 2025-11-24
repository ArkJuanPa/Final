package client;

import Demo.*;
import java.util.Arrays;
import javax.swing.JOptionPane;
import com.zeroc.Ice.Current;

/**
 * Callback que recibe notificaciones del servidor.
 * Requiere PlayerThread disponible en ObserverI.player (externo).
 */
public class ObserverI implements Observer {

    public static PlayerThread player;

    @Override
    public void receiveAudio(byte[] data, Current c) {
        if (player != null && data != null && data.length > 0) {
            player.play(data);
        }
    }

    @Override
    public void receiveAudioMessage(byte[] data, Current c) {
        System.out.println("[CLIENT] Mensaje de audio recibido");
        if (player != null && data != null && data.length > 0) {
            player.play(data);
        }
    }

    @Override
    public void incomingCall(String fromUser, Current c) {
        int r = JOptionPane.showConfirmDialog(null,
                fromUser + " te está llamando",
                "Llamada entrante",
                JOptionPane.YES_NO_OPTION);

        if (r == JOptionPane.YES_OPTION) {
            // aceptar -> notificamos al servidor
            try {
                AudioClient.subject.acceptCall(fromUser, AudioClient.userId);
                AudioClient.startStreaming = true;
            } catch (Exception ex) {
                System.err.println("[CLIENT] Error al aceptar llamada: " + ex);
            }
        } else {
            try {
                AudioClient.subject.rejectCall(fromUser, AudioClient.userId);
            } catch (Exception ex) {
                System.err.println("[CLIENT] Error al rechazar llamada: " + ex);
            }
        }
    }

    @Override
    public void callAccepted(String fromUser, Current c) {
        JOptionPane.showMessageDialog(null, fromUser + " aceptó tu llamada");
        AudioClient.startStreaming = true;
    }

    @Override
    public void callColgada(String fromUser, Current c) {
        // Notificación de que alguien colgó.
        JOptionPane.showMessageDialog(null, fromUser + " colgó la llamada");
        // No volvemos a llamar a subject.colgar para evitar loop.
        if (player != null) player.setPlay(false);
        AudioClient.startStreaming = false;
    }

    @Override
    public void callRejected(String fromUser, Current c) {
        JOptionPane.showMessageDialog(null, fromUser + " rechazó tu llamada");
    }

    // Métodos de llamadas grupales y mensajes de audio grupales
    @Override
    public void incomingGroupCall(String groupId, String fromUser, String[] members, Current c) {
        System.out.println("[CLIENT] Llamada grupal entrante: " + groupId + " from: " + fromUser
                + " members=" + Arrays.toString(members));
        int r = JOptionPane.showConfirmDialog(null,
                fromUser + " inició una llamada grupal. Unirse?",
                "Llamada grupal entrante",
                JOptionPane.YES_NO_OPTION);
        if (r == JOptionPane.YES_OPTION) {
            try {
                AudioClient.subject.joinGroupCall(groupId, AudioClient.userId);
                AudioClient.startStreaming = true;
            } catch (Exception ex) {
                System.err.println("[CLIENT] Error al unirse a llamada grupal: " + ex);
            }
        }
    }

    @Override
    public void groupCallUpdated(String groupId, String[] members, Current c) {
        System.out.println("[CLIENT] Grupo actualizado: " + groupId + " miembros=" + Arrays.toString(members));
        // Aquí se puede actualizar UI con la nueva lista de miembros si hay una.
    }

    @Override
    public void groupCallEnded(String groupId, Current c) {
        System.out.println("[CLIENT] Llamada grupal terminada: " + groupId);
        if (player != null) player.setPlay(false);
        AudioClient.startStreaming = false;
    }

    @Override
    public void receiveAudioMessageGroup(String groupId, byte[] data, Current current) {
        System.out.println("[CLIENT] Mensaje de audio grupal recibido en grupo " + groupId);
        if (player != null && data != null && data.length > 0) {
            player.play(data);
        }
    }
}

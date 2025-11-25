package client;

import Demo.*;
import java.util.Arrays;
import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;
import com.zeroc.Ice.Current;

public class ObserverI implements Observer {

    public static PlayerThread player;

    @Override
    public void receiveAudio(byte[] data, Current c) {
        if (data != null && data.length > 0) {
            System.out.println("[CLIENT] Audio recibido: " + data.length + " bytes");
            if (player != null) {
                player.play(data);
            }
        }
    }

    @Override
    public void receiveAudioMessage(byte[] data, Current c) {
        System.out.println("[CLIENT] Mensaje de audio recibido: " + data.length + " bytes");
        if (player != null && data != null && data.length > 0) {
            player.play(data);

            SwingUtilities.invokeLater(() -> {
                System.out.println("[CLIENT] Reproduciendo mensaje de audio...");
            });
        }
    }

    @Override
    public void incomingCall(String fromUser, Current c) {
        System.out.println("[CLIENT] Llamada entrante de: " + fromUser);

        SwingUtilities.invokeLater(() -> {
            int r = JOptionPane.showConfirmDialog(
                null,
                fromUser + " te esta llamando",
                "Llamada entrante",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.QUESTION_MESSAGE
            );

            if (r == JOptionPane.YES_OPTION) {
                try {
                    System.out.println("[CLIENT] Aceptando llamada de " + fromUser);
                    AudioClient.subject.acceptCall(fromUser, AudioClient.userId);
                    AudioClient.startStreaming = true;

                    if (player != null) {
                        player.setPlay(true);
                    }
                } catch (Exception ex) {
                    System.err.println("[CLIENT] Error aceptando llamada: " + ex);
                    JOptionPane.showMessageDialog(null, "Error al aceptar la llamada");
                }
            } else {
                try {
                    System.out.println("[CLIENT] Rechazando llamada de " + fromUser);
                    AudioClient.subject.rejectCall(fromUser, AudioClient.userId);
                } catch (Exception ex) {
                    System.err.println("[CLIENT] Error rechazando llamada: " + ex);
                }
            }
        });
    }

    @Override
    public void callAccepted(String fromUser, Current c) {
        System.out.println("[CLIENT] Llamada aceptada por: " + fromUser);

        SwingUtilities.invokeLater(() -> {
            JOptionPane.showMessageDialog(
                null,
                fromUser + " acepto tu llamada",
                "Llamada conectada",
                JOptionPane.INFORMATION_MESSAGE
            );

            AudioClient.startStreaming = true;

            if (player != null) {
                player.setPlay(true);
            }
        });
    }

    @Override
    public void callColgada(String fromUser, Current c) {
        System.out.println("[CLIENT] Llamada colgada por: " + fromUser);

        SwingUtilities.invokeLater(() -> {
            JOptionPane.showMessageDialog(
                null,
                fromUser + " colgo la llamada",
                "Llamada finalizada",
                JOptionPane.INFORMATION_MESSAGE
            );

            AudioClient.startStreaming = false;

            if (player != null) {
                player.setPlay(false);
            }
        });
    }

    @Override
    public void callRejected(String fromUser, Current c) {
        System.out.println("[CLIENT] Llamada rechazada por: " + fromUser);

        SwingUtilities.invokeLater(() -> {
            JOptionPane.showMessageDialog(
                null,
                fromUser + " rechazo tu llamada",
                "Llamada rechazada",
                JOptionPane.WARNING_MESSAGE
            );

            AudioClient.startStreaming = false;
        });
    }

    @Override
    public void incomingGroupCall(String groupId, String fromUser, String[] members, Current c) {
        System.out.println("[CLIENT] Llamada grupal entrante: " + groupId + " de " + fromUser);
        System.out.println("[CLIENT] Miembros: " + Arrays.toString(members));

        SwingUtilities.invokeLater(() -> {
            String memberList = String.join(", ", members);
            int r = JOptionPane.showConfirmDialog(
                null,
                fromUser + " inicio una llamada grupal\n" +
                "Miembros: " + memberList + "\n\nUnirse?",
                "Llamada grupal entrante",
                JOptionPane.YES_NO_OPTION,
                JOptionPane.QUESTION_MESSAGE
            );

            if (r == JOptionPane.YES_OPTION) {
                try {
                    System.out.println("[CLIENT] Uniendose a llamada grupal: " + groupId);
                    AudioClient.subject.joinGroupCall(groupId, AudioClient.userId);
                    AudioClient.startStreaming = true;

                    if (player != null) {
                        player.setPlay(true);
                    }
                } catch (Exception ex) {
                    System.err.println("[CLIENT] Error uniendose a llamada grupal: " + ex);
                    JOptionPane.showMessageDialog(null, "Error al unirse a la llamada grupal");
                }
            }
        });
    }

    @Override
    public void groupCallUpdated(String groupId, String[] members, Current c) {
        System.out.println("[CLIENT] Grupo actualizado: " + groupId);
        System.out.println("[CLIENT] Miembros actuales: " + Arrays.toString(members));
    }

    @Override
    public void groupCallEnded(String groupId, Current c) {
        System.out.println("[CLIENT] Llamada grupal finalizada: " + groupId);

        SwingUtilities.invokeLater(() -> {
            JOptionPane.showMessageDialog(
                null,
                "La llamada grupal ha finalizado",
                "Llamada finalizada",
                JOptionPane.INFORMATION_MESSAGE
            );

            AudioClient.startStreaming = false;

            if (player != null) {
                player.setPlay(false);
            }
        });
    }

    @Override
    public void receiveAudioMessageGroup(String groupId, byte[] data, Current current) {
        System.out.println("[CLIENT] Mensaje de audio grupal recibido en grupo: " + groupId);
        System.out.println("[CLIENT] Tamano: " + data.length + " bytes");

        if (player != null && data != null && data.length > 0) {
            player.play(data);
            System.out.println("[CLIENT] Reproduciendo mensaje de audio grupal...");
        }
    }
}

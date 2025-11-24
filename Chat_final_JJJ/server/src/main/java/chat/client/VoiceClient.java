package chat.client;

import chat.audio.AudioCapture;
import chat.audio.AudioPlayback;
import chat.model.AudioPacket;

import javax.sound.sampled.LineUnavailableException;
import java.io.IOException;
import java.net.*;

public class VoiceClient {
    private static final String SERVER_HOST = "localhost";
    private static final int UDP_PORT = 5001;
    private static final int BUFFER_SIZE = 10240 + 24; // Audio buffer + AudioPacket header

    private DatagramSocket socket;
    private InetAddress serverAddress;
    private boolean inCall = false;
    private Thread sendThread;
    private Thread listenerThread;
    private volatile boolean running = true;

    private AudioCapture audioCapture;
    private AudioPlayback audioPlayback;

    private int userId;
    private int otherUserId;
    private int sequenceNumber = 0;

    public VoiceClient(int userId) throws SocketException, UnknownHostException, LineUnavailableException {
        this.userId = userId;
        this.socket = new DatagramSocket();
        this.serverAddress = InetAddress.getByName(SERVER_HOST);
        this.audioCapture = new AudioCapture();
        this.audioPlayback = new AudioPlayback();

        audioPlayback.start();
        audioPlayback.setPlay(true);

        registerWithServer();
        startBackgroundListener();
    }

    private void registerWithServer() {
        try {
            AudioPacket registerPacket = new AudioPacket(userId, 0, 0, new byte[0]);
            byte[] packetData = registerPacket.toBytes();

            DatagramPacket packet = new DatagramPacket(
                    packetData,
                    packetData.length,
                    serverAddress,
                    UDP_PORT
            );
            socket.send(packet);
            System.out.println("[VoiceClient] Registrado con servidor UDP");
        } catch (IOException e) {
            System.err.println("Error registrando con servidor UDP: " + e.getMessage());
        }
    }

    private void startBackgroundListener() {
        listenerThread = new Thread(() -> {
            byte[] buffer = new byte[BUFFER_SIZE];

            while (running) {
                try {
                    DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                    socket.setSoTimeout(100);
                    socket.receive(packet);

                    byte[] receivedData = new byte[packet.getLength()];
                    System.arraycopy(packet.getData(), 0, receivedData, 0, packet.getLength());

                    AudioPacket audioPacket = AudioPacket.fromBytes(receivedData);

                    if (audioPacket.getAudioData() == null || audioPacket.getAudioData().length == 0) {
                        continue;
                    }

                    audioPlayback.play(audioPacket.getAudioData());

                } catch (SocketTimeoutException e) {
                    // Timeout normal
                } catch (IOException e) {
                    if (running) {
                        System.err.println("Error en listener de audio: " + e.getMessage());
                    }
                }
            }
        });
        listenerThread.setDaemon(true);
        listenerThread.start();
    }

    public void startCall(int otherUserId) {
        if (inCall) {
            System.err.println("Ya estas en una llamada activa");
            return;
        }

        this.otherUserId = otherUserId;
        this.inCall = true;
        this.sequenceNumber = 0;

        System.out.println("Inicializando dispositivos de audio...");

        try {
            audioCapture.init();
        } catch (LineUnavailableException e) {
            System.err.println("Error en dispositivos de audio: " + e.getMessage());
            inCall = false;
            return;
        }

        sendThread = new Thread(this::sendAudio);
        sendThread.setName("Voice-Send-Thread");
        sendThread.start();

        System.out.println("Llamada iniciada con usuario " + otherUserId);
        System.out.println(" -- Hable ahora... --");
    }

    private void sendAudio() {
        while (inCall) {
            byte[] buffer = audioCapture.captureChunk();

            if (buffer != null) {
                try {
                    AudioPacket audioPacket = new AudioPacket(userId, otherUserId, sequenceNumber++, buffer);
                    byte[] packetData = audioPacket.toBytes();

                    DatagramPacket packet = new DatagramPacket(
                            packetData,
                            packetData.length,
                            serverAddress,
                            UDP_PORT
                    );
                    socket.send(packet);
                } catch (IOException e) {
                    if (inCall) {
                        System.err.println("Error enviando audio: " + e.getMessage());
                    }
                }
            }
        }
    }

    public void sendVoiceNote(int receiverId, int durationSeconds) {
        System.out.println("=== Grabando nota de voz por " + durationSeconds + " segundos ===");
        System.out.println("Hable ahora...");

        try {
            audioCapture.init();

            long startTime = System.currentTimeMillis();
            int seq = 0;

            while (System.currentTimeMillis() - startTime < durationSeconds * 1000) {
                byte[] buffer = audioCapture.captureChunk();

                if (buffer != null) {
                    AudioPacket audioPacket = new AudioPacket(userId, receiverId, seq++, buffer);
                    byte[] packetData = audioPacket.toBytes();

                    DatagramPacket packet = new DatagramPacket(
                            packetData,
                            packetData.length,
                            serverAddress,
                            UDP_PORT
                    );
                    socket.send(packet);
                }
            }

            audioCapture.stopCapture();
            System.out.println("=== Nota de voz enviada exitosamente (" + seq + " paquetes) ===");

        } catch (LineUnavailableException e) {
            System.err.println("Error accediendo al microfono: " + e.getMessage());
        } catch (IOException e) {
            System.err.println("Error enviando nota de voz: " + e.getMessage());
        }
    }

    public void endCall() {
        if (!inCall) return;

        System.out.println("=== Finalizando llamada... ===");

        inCall = false;

        if (sendThread != null && sendThread.isAlive()) {
            sendThread.interrupt();
            try {
                sendThread.join(500);
            } catch (InterruptedException ignored) {}
        }

        try { audioCapture.stopCapture(); } catch (Exception ignored) {}

        otherUserId = -1;
        sequenceNumber = 0;

        System.out.println("-- Llamada finalizada --\n");
    }

    public void close() {
        running = false;
        endCall();

        if (listenerThread != null) {
            listenerThread.interrupt();
        }

        audioPlayback.stopPlayback();

        if (socket != null && !socket.isClosed()) {
            socket.close();
        }
    }

    public boolean isInCall() {
        return inCall;
    }
}
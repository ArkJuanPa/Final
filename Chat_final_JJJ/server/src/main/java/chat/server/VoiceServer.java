package chat.server;

import chat.config.ServerConfig;
import chat.model.AudioPacket;

import java.io.IOException;
import java.net.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class VoiceServer implements Runnable {
    private final ServerConfig config;
    private DatagramSocket socket;
    private boolean running = true;

    private static final int BUFFER_SIZE = 10240 + 24; // Audio buffer + header size
    private static final Map<Integer, InetSocketAddress> activeVoiceClients = new ConcurrentHashMap<>();
    private final ExecutorService threadPool = Executors.newFixedThreadPool(Runtime.getRuntime().availableProcessors() * 2);

    public VoiceServer() throws SocketException {
        this.config = ServerConfig.getInstance();
        this.socket = new DatagramSocket(config.getUdpPort());
        this.socket.setSoTimeout(20);
    }

    public static void main(String[] args) {
        try {
            VoiceServer server = new VoiceServer();

            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                System.out.println("\nCerrando servidor de voz...");
                server.stop();
            }));

            server.run();

        } catch (SocketException e) {
            System.err.println("Error al iniciar servidor de voz: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void run() {
        System.out.println("=== Servidor de voz UDP iniciado en puerto " + config.getUdpPort() + " ===");

        byte[] buffer = new byte[BUFFER_SIZE];

        while (running) {
            try {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                socket.receive(packet);

                byte[] packetData = new byte[packet.getLength()];
                System.arraycopy(packet.getData(), 0, packetData, 0, packet.getLength());

                InetAddress senderAddress = packet.getAddress();
                int senderPort = packet.getPort();

                threadPool.submit(() -> handleAudioPacket(packetData, senderAddress, senderPort));

            } catch (SocketTimeoutException e) {
                // Timeout normal
            } catch (IOException e) {
                if (running) {
                    System.err.println("Error en servidor de voz: " + e.getMessage());
                }
            }
        }

        threadPool.shutdown();
        socket.close();
        System.out.println("Servidor de voz UDP detenido");
    }

    private void handleAudioPacket(byte[] packetData, InetAddress senderAddress, int senderPort) {
        try {
            AudioPacket audioPacket = AudioPacket.fromBytes(packetData);

            int senderId = audioPacket.getSenderId();
            int receiverId = audioPacket.getReceiverId();

            activeVoiceClients.put(senderId, new InetSocketAddress(senderAddress, senderPort));

            if (receiverId == 0) {
                return;
            }

            InetSocketAddress receiverAddress = activeVoiceClients.get(receiverId);
            if (receiverAddress != null) {
                DatagramPacket forwardPacket = new DatagramPacket(
                        packetData,
                        packetData.length,
                        receiverAddress.getAddress(),
                        receiverAddress.getPort()
                );
                socket.send(forwardPacket);
            }

        } catch (Exception e) {
            System.err.println("Error procesando audio: " + e.getMessage());
        }
    }

    public void stop() {
        running = false;
    }
}
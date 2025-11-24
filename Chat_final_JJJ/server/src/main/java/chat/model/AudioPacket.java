package chat.model;

import java.io.Serializable;
import java.nio.ByteBuffer;

public class AudioPacket implements Serializable {
    private static final long serialVersionUID = 1L;

    private int senderId;
    private int receiverId;
    private int sequenceNumber;
    private long timestamp;
    private byte[] audioData;
    private int dataLength;

    public AudioPacket() {
        this.timestamp = System.currentTimeMillis();
    }

    public AudioPacket(int senderId, int receiverId, int sequenceNumber, byte[] audioData) {
        this();
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.sequenceNumber = sequenceNumber;
        this.audioData = audioData;
        this.dataLength = audioData != null ? audioData.length : 0;
    }

    // Serializar a bytes para UDP
    public byte[] toBytes() {
        ByteBuffer buffer = ByteBuffer.allocate(24 + dataLength);
        buffer.putInt(senderId);
        buffer.putInt(receiverId);
        buffer.putInt(sequenceNumber);
        buffer.putLong(timestamp);
        buffer.putInt(dataLength);
        if (audioData != null) {
            buffer.put(audioData);
        }
        return buffer.array();
    }

    // Deserializar desde bytes
    public static AudioPacket fromBytes(byte[] data) {
        if (data == null || data.length < 20) {
            // Paquete incompleto - retornar paquete vacío
            return new AudioPacket();
        }

        try {
            ByteBuffer buffer = ByteBuffer.wrap(data);
            AudioPacket packet = new AudioPacket();
            packet.senderId = buffer.getInt();
            packet.receiverId = buffer.getInt();
            packet.sequenceNumber = buffer.getInt();
            packet.timestamp = buffer.getLong();
            packet.dataLength = buffer.getInt();

            if (packet.dataLength > 0 && buffer.remaining() >= packet.dataLength) {
                packet.audioData = new byte[packet.dataLength];
                buffer.get(packet.audioData);
            } else if (packet.dataLength > 0) {
                // Si dataLength indica bytes pero no están disponibles, es paquete corrupto
                System.err.println("[AudioPacket] Paquete corrupto: dataLength=" + packet.dataLength +
                        " pero solo hay " + buffer.remaining() + " bytes disponibles");
                packet.dataLength = 0;
                packet.audioData = null;
            }

            return packet;
        } catch (Exception e) {
            System.err.println("[AudioPacket] Error deserializando paquete: " + e.getMessage());
            return new AudioPacket();
        }
    }

    public int getSenderId() {
        return senderId;
    }

    public void setSenderId(int senderId) {
        this.senderId = senderId;
    }

    public int getReceiverId() {
        return receiverId;
    }

    public void setReceiverId(int receiverId) {
        this.receiverId = receiverId;
    }

    public int getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(int sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public byte[] getAudioData() {
        return audioData;
    }

    public void setAudioData(byte[] audioData) {
        this.audioData = audioData;
        this.dataLength = audioData != null ? audioData.length : 0;
    }

    public int getDataLength() {
        return dataLength;
    }
}

package chat.audio;

import javax.sound.sampled.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public class AudioCapture {
    private static final int SAMPLE_RATE = 44100;
    private static final int SAMPLE_SIZE_BITS = 16;
    private static final int CHANNELS = 1;
    private static final boolean SIGNED = true;
    private static final boolean BIG_ENDIAN = true;
    private static final int BUFFER_SIZE = 10240;

    private TargetDataLine microphone;
    private AudioFormat format;
    private boolean isCapturing = false;

    public AudioCapture() {
        this.format = new AudioFormat(SAMPLE_RATE, SAMPLE_SIZE_BITS, CHANNELS, SIGNED, BIG_ENDIAN);
    }

    public void init() throws LineUnavailableException {
        DataLine.Info info = new DataLine.Info(TargetDataLine.class, format);

        if (!AudioSystem.isLineSupported(info)) {
            throw new LineUnavailableException("Linea de audio no soportada");
        }

        microphone = (TargetDataLine) AudioSystem.getLine(info);
        microphone.open(format);
        microphone.start();
        isCapturing = true;

        System.out.println("Captura de audio iniciada");
    }

    public byte[] captureChunk() {
        if (!isCapturing || microphone == null) {
            return null;
        }

        byte[] buffer = new byte[BUFFER_SIZE];
        int bytesRead = microphone.read(buffer, 0, buffer.length);

        if (bytesRead > 0) {
            return buffer;
        }

        return null;
    }

    public byte[] recordForDuration(int durationMillis) throws LineUnavailableException {
        init();

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        long startTime = System.currentTimeMillis();

        while (System.currentTimeMillis() - startTime < durationMillis) {
            byte[] chunk = captureChunk();
            if (chunk != null && chunk.length > 0) {
                try {
                    outputStream.write(chunk);
                } catch (IOException e) {
                    System.err.println("Error escribiendo audio: " + e.getMessage());
                }
            }
        }

        stopCapture();
        return outputStream.toByteArray();
    }

    public void stopCapture() {
        isCapturing = false;
        if (microphone != null) {
            microphone.stop();
            microphone.close();
            System.out.println("Captura de audio detenida");
        }
    }

    public boolean isCapturing() {
        return isCapturing;
    }

    public AudioFormat getFormat() {
        return format;
    }
}
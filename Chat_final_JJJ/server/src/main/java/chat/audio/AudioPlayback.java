package chat.audio;

import javax.sound.sampled.*;
import java.util.LinkedList;
import java.util.Queue;

public class AudioPlayback extends Thread {
    private static final int SAMPLE_RATE = 44100;
    private static final int SAMPLE_SIZE_BITS = 16;
    private static final int CHANNELS = 1;
    private static final boolean SIGNED = true;
    private static final boolean BIG_ENDIAN = true;

    private static Queue<byte[]> audioBytes = new LinkedList<>();
    private boolean isPlay;
    private DataLine.Info infoSpeaker;
    private SourceDataLine speaker;
    private AudioFormat format;

    public AudioPlayback() throws LineUnavailableException {
        this.format = new AudioFormat(SAMPLE_RATE, SAMPLE_SIZE_BITS, CHANNELS, SIGNED, BIG_ENDIAN);
        infoSpeaker = new DataLine.Info(SourceDataLine.class, format);
        speaker = (SourceDataLine) AudioSystem.getLine(infoSpeaker);
        speaker.open(format);
        speaker.start();
    }

    public void setPlay(boolean isPlay) {
        this.isPlay = isPlay;
    }

    public void play(byte[] batch) {
        audioBytes.add(batch);
        System.out.println("add bytes");
    }

    // Metodo para reproduccion directa (usado en notas de voz)
    public void playChunk(byte[] audioData) {
        if (speaker != null && audioData != null && audioData.length > 0) {
            speaker.write(audioData, 0, audioData.length);
        }
    }

    // Metodo para iniciar reproduccion (compatibilidad con ChatClient)
    public void startPlayback() throws LineUnavailableException {
        if (speaker == null || !speaker.isOpen()) {
            speaker = (SourceDataLine) AudioSystem.getLine(infoSpeaker);
            speaker.open(format);
            speaker.start();
        }
    }

    @Override
    public void run() {
        while (true) {
            try {
                if (isPlay) {
                    if (!audioBytes.isEmpty()) {
                        byte[] current = audioBytes.poll();
                        if (current != null) {
                            System.out.println("Reproduciendo audio ...");
                            speaker.write(current, 0, current.length);
                        }
                    } else {
                        Thread.yield();
                    }
                } else {
                    Thread.sleep(5000);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public void stopPlayback() {
        if (speaker != null) {
            speaker.drain();
            speaker.stop();
            speaker.close();
        }
    }

    public boolean isPlaying() {
        return isPlay;
    }

    public AudioFormat getFormat() {
        return format;
    }
}
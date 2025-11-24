package client;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import javax.sound.sampled.*;

public class PlayerThread extends Thread {

    private final Queue<byte[]> audioBytes = new ConcurrentLinkedQueue<>();
    private boolean isPlay;
    private final SourceDataLine speaker;

    public PlayerThread(AudioFormat format) throws Exception {
        DataLine.Info infoSpeaker = new DataLine.Info(SourceDataLine.class, format);
        speaker = (SourceDataLine) AudioSystem.getLine(infoSpeaker);
        speaker.open(format);
        speaker.start();
    }

    public void setPlay(boolean isPlay) {
        this.isPlay = isPlay;
    }


    public void play(byte[] batch) {
        audioBytes.add(batch);
    }

    @Override
    public void run() {
        while (true) {
            try {
                if (isPlay && !audioBytes.isEmpty()) {
                    byte[] current = audioBytes.poll();
                    if (current != null) {
                        speaker.write(current, 0, current.length);
                    }
                } else {
                    Thread.sleep(5000); // dormir poco para no bloquear
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}

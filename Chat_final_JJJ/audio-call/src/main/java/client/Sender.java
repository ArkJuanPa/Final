package client;

import Demo.SubjectPrx;
import javax.sound.sampled.*;

public class Sender extends Thread {

    private final String userId;
    private final SubjectPrx subject;
    private final TargetDataLine mic;

    public Sender(String userId, SubjectPrx subject) throws Exception {
        this.userId = userId;
        this.subject = subject;

        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);
        DataLine.Info infoMic = new DataLine.Info(TargetDataLine.class, format);
        mic = (TargetDataLine) AudioSystem.getLine(infoMic);
        mic.open(format);
        mic.start();
    }

    @Override
    public void run() {
        byte[] buffer = new byte[10240];
        while (true) {
            if (AudioClient.startStreaming) {
                int n = mic.read(buffer, 0, buffer.length);
                if (n > 0) {
                    byte[] copy = new byte[n];
                    System.arraycopy(buffer, 0, copy, 0, n);
                    subject.sendAudioAsync(userId, copy);
                }
            } else {
                try { Thread.sleep(50); } catch (InterruptedException e) {}
            }
        }
    }
}

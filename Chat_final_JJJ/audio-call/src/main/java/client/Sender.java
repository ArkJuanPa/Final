package client;

import Demo.SubjectPrx;
import javax.sound.sampled.*;

public class Sender extends Thread {

    private final String userId;
    private final SubjectPrx subject;
    private final TargetDataLine mic;
    private volatile boolean running = true;

    public Sender(String userId, SubjectPrx subject) throws Exception {
        this.userId = userId;
        this.subject = subject;

        AudioFormat format = new AudioFormat(44100, 16, 1, true, true);
        DataLine.Info infoMic = new DataLine.Info(TargetDataLine.class, format);
        mic = (TargetDataLine) AudioSystem.getLine(infoMic);
        mic.open(format);
        mic.start();
        
        System.out.println("[SENDER]  Microfono inicializado correctamente");
    }

    @Override
    public void run() {
        byte[] buffer = new byte[10240];
        int consecutiveErrors = 0;
        
        System.out.println("[SENDER] Thread de envio de audio iniciado");
        
        while (running) {
            try {
                if (AudioClient.startStreaming) {
                    int n = mic.read(buffer, 0, buffer.length);
                    
                    if (n > 0) {
                        byte[] copy = new byte[n];
                        System.arraycopy(buffer, 0, copy, 0, n);
                        
                        try {
                            // Enviar de forma asíncrona para evitar bloqueos
                            subject.sendAudioAsync(userId, copy)
                                .whenComplete((result, ex) -> {
                                    if (ex != null) {
                                        System.err.println("[SENDER]  Error enviando audio: " + ex.getMessage());
                                    }
                                });
                            
                            // Resetear contador de errores si el envío fue exitoso
                            consecutiveErrors = 0;
                            
                        } catch (Exception e) {
                            consecutiveErrors++;
                            System.err.println("[SENDER] Error enviando audio (" + consecutiveErrors + "): " + e.getMessage());
                            
                            // Si hay muchos errores consecutivos, pausar un momento
                            if (consecutiveErrors > 10) {
                                System.err.println("[SENDER]  Demasiados errores, pausando 1 segundo...");
                                Thread.sleep(1000);
                                consecutiveErrors = 0;
                            }
                        }
                    }
                } else {
                    // Cuando no está streaming, dormir más para no desperdiciar CPU
                    Thread.sleep(100);
                    consecutiveErrors = 0;
                }
                
            } catch (InterruptedException e) {
                System.out.println("[SENDER] Thread interrumpido");
                running = false;
                break;
            } catch (Exception e) {
                System.err.println("[SENDER] Error inesperado en el loop: " + e.getMessage());
                e.printStackTrace();
                
                try {
                    Thread.sleep(100);
                } catch (InterruptedException ie) {
                    running = false;
                    break;
                }
            }
        }
        
        cleanup();
        System.out.println("[SENDER] Thread de envío finalizado");
    }

    private void cleanup() {
        try {
            if (mic != null && mic.isOpen()) {
                mic.stop();
                mic.close();
                System.out.println("[SENDER] Microfono cerrado");
            }
        } catch (Exception e) {
            System.err.println("[SENDER] Error cerrando microfono: " + e.getMessage());
        }
    }

    public void shutdown() {
        System.out.println("[SENDER]  Solicitando cierre del sender...");
        running = false;
        this.interrupt();
    }
}
package server;

import java.util.concurrent.*;
import java.util.*;
import Demo.*;
import com.zeroc.Ice.Current;

public class SubjectImpl implements Subject {

    private final Map<String, ObserverPrx> observers = new ConcurrentHashMap<>();
    // último timestamp (ms) que el servidor vio actividad del usuario
    private final Map<String, Long> lastSeen = new ConcurrentHashMap<>();

    // llamadas activas (igual que antes)
    private final Map<String, String> activeCalls = new ConcurrentHashMap<>();

    // limpiador de usuarios inactivos
    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor();
    // tiempo máximo sin heartbeat antes de considerar desconectado (ms)
    private final long STALE_MS = 300_000; // 60 segundos

    public SubjectImpl() {
        // arrancar tarea que limpia usuarios inactivos cada 30s
        cleaner.scheduleAtFixedRate(() -> {
            try {
                long now = System.currentTimeMillis();
                List<String> toRemove = new ArrayList<>();
                for (Map.Entry<String, Long> e : lastSeen.entrySet()) {
                    if (now - e.getValue() > STALE_MS) {
                        toRemove.add(e.getKey());
                    }
                }
                for (String u : toRemove) {
                    System.out.println("[SERVER] Usuario considerado inactivo (timeout): " + u);
                    observers.remove(u);
                    lastSeen.remove(u);
                    // además, limpiar llamadas activas si estaba en una
                    String peer = activeCalls.remove(u);
                    if (peer != null) {
                        activeCalls.remove(peer);
                        // notificar peer que la otra parte se desconectó
                        ObserverPrx prx = observers.get(peer);
                        if (prx != null) {
                            try { prx.callColgadaAsync(u); } catch (Exception ex) { }
                        }
                    }
                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }, 30, 30, TimeUnit.SECONDS);
    }

    @Override
    public synchronized void attach(String userId, ObserverPrx obs, Current c) {
        ObserverPrx proxy = obs.ice_fixed(c.con);
        observers.put(userId, proxy);
        lastSeen.put(userId, System.currentTimeMillis());

        System.out.println("[SERVER] Usuario conectado: " + userId);

        if (c.con != null) {
            // seguir manteniendo closeCallback si está disponible, pero no depender exclusivamente de él
            try {
                c.con.setCloseCallback(con -> {
                    System.out.println("[SERVER] Close callback: Usuario desconectado: " + userId);
                    observers.remove(userId);
                    lastSeen.remove(userId);
                });
            } catch (Exception e) {
                // algunas conexiones ws no permiten closeCallback igual; no es crítico
            }
        }
    }

    // Nuevo método: heartbeat


    @Override
    public synchronized void sendAudio(String fromUser, byte[] data, Current c) {
        String target = activeCalls.get(fromUser);

        // Evitar enviar audio si no hay receptor o la llamada terminó
        if (target == null || data == null || data.length == 0) {
            System.out.println("[SERVER] No hay receptor válido o buffer vacío para " + fromUser);
            return;
        }

        ObserverPrx prx = observers.get(target);
        if (prx != null) {
            try {
                prx.receiveAudioAsync(data);
                System.out.println("[SERVER] Audio enviado correctamente a " + target);
            } catch (Exception e) {
                System.err.println("[SERVER] Error enviando audio a " + target + ": " + e);
            }
        } else {
            System.out.println("[SERVER] No se encontró proxy para " + target);
        }
    }


    @Override
    public synchronized void sendAudioMessage(String fromUser, String toUser, byte[] data, Current c) {
        ObserverPrx dest = observers.get(toUser);
        if (dest != null) {
            dest.receiveAudioMessageAsync(data);
        } else {
            System.out.println("[SERVER] sendAudioMessage: destino no conectado: " + toUser);
        }
    }

    @Override
    public synchronized void startCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] startCall: " + fromUser + " llamando a " + toUser);
        ObserverPrx dest = observers.get(toUser);
        if (dest != null) {
            dest.incomingCallAsync(fromUser);
            System.out.println("[SERVER] Notificación de llamada enviada a " + toUser);
        } else {
            System.out.println("[SERVER] startCall: destino no conectado: " + toUser);
        }
    }

    @Override
    public synchronized void acceptCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] acceptCall: " + fromUser + " -> " + toUser);
        ObserverPrx caller = observers.get(fromUser);
        if (caller != null) {
            caller.callAcceptedAsync(toUser);
            System.out.println("[SERVER] Llamada aceptada enviada a " + fromUser);
            // Marcar la llamada activa
            activeCalls.put(fromUser, toUser);
            activeCalls.put(toUser, fromUser);
        }
    }

    @Override
    public synchronized void rejectCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] rejectCall: " + fromUser + " -> " + toUser);
        ObserverPrx caller = observers.get(fromUser);
        if (caller != null) {
            caller.callRejectedAsync(toUser);
            System.out.println("[SERVER] Llamada rechazada enviada a " + fromUser);
        }
    }

    @Override
    public synchronized void colgar(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] colgó : " + fromUser + " -> " + toUser);

        ObserverPrx caller = observers.get(fromUser);
        if (caller != null) {
            caller.callColgadaAsync(fromUser);
        }

        ObserverPrx receiver = observers.get(toUser);
        if (receiver != null) {
            receiver.callColgadaAsync(fromUser); // aquí enviamos quién colgó
        }

        activeCalls.remove(fromUser);
        activeCalls.remove(toUser);

        System.out.println("[SERVER] Notificación de colgado enviada a ambos usuarios");
    }

    @Override
    public synchronized String[] getConnectedUsers(Current current) {
        System.out.println("[SERVER] Enviando lista de usuarios conectados...");
        long now = System.currentTimeMillis();
        List<String> alive = new ArrayList<>();
        for (Map.Entry<String, Long> e : lastSeen.entrySet()) {
            if (now - e.getValue() <= STALE_MS) {
                alive.add(e.getKey());
            } else {
                // opcional: si encuentras stale aquí, también lo limpias
                observers.remove(e.getKey());
                lastSeen.remove(e.getKey());
            }
        }
        return alive.toArray(new String[0]);
    }

    // Método para limpiar recursos al apagar el servidor (opcional)
    public void shutdown() {
        cleaner.shutdownNow();
    }
}

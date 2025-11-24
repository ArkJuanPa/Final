package server;

import java.util.concurrent.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import Demo.*;
import com.zeroc.Ice.Current;

/**
 * Implementación del Subject (servidor de señalización/audio).
 * Soporta:
 * - attach/detach de observers
 * - llamadas 1-a-1 (startCall, acceptCall, rejectCall, colgar)
 * - envío de audio 1-a-1 (sendAudio)
 * - mensajes de voz (sendAudioMessage)
 * - llamadas grupales: create/join/leave/sendAudioGroup
 *
 * Nota: Asume que las clases ObserverPrx y Subject provienen del Slice generado.
 */
public class SubjectImpl implements Subject {

    // Proxies de observers (userId -> proxy)
    private final Map<String, ObserverPrx> observers = new ConcurrentHashMap<>();
    // Último seen para timeout (userId -> timestamp)
    private final Map<String, Long> lastSeen = new ConcurrentHashMap<>();

    // llamadas activas entre pares (user -> peer)
    private final Map<String, String> activeCalls = new ConcurrentHashMap<>();

    // llamadas grupales: groupId -> set of members (userIds)
    private final Map<String, Set<String>> groupMembers = new ConcurrentHashMap<>();

    // executor que limpia users inactivos
    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor();
    private final long STALE_MS = 300_000; // 5 minutos

    // generador simple de ids
    private final AtomicLong idGen = new AtomicLong(System.currentTimeMillis());

    public SubjectImpl() {
        // limpia usuarios inactivos periódicamente
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
                    System.out.println("[SERVER] Usuario inactivo (timeout): " + u);

                    // Capture peer before removing state to avoid races
                    String peer = activeCalls.remove(u);
                    if (peer != null) {
                        // also remove reverse mapping if present
                        activeCalls.remove(peer);
                    }

                    observers.remove(u);
                    lastSeen.remove(u);

                    // Notify peer (if still connected)
                    if (peer != null) {
                        ObserverPrx peerPrx = observers.get(peer);
                        if (peerPrx != null) {
                            try {
                                peerPrx.callColgadaAsync(u);
                            } catch (Exception ex) {
                                // ignorar problema notificando
                            }
                        }
                    }

                    // Sacar de grupos y notificar (hacer snapshot de grupos afectados)
                    List<String> groupsToCheck = new ArrayList<>(groupMembers.keySet());
                    for (String gid : groupsToCheck) {
                        Set<String> members = groupMembers.get(gid);
                        if (members == null) continue;
                        boolean removed = members.remove(u);
                        if (removed) {
                            notifyGroupUpdated(gid);
                        }
                    }

                    // eliminar grupos vacíos (hacer snapshot para evitar ConcurrentModification)
                    List<String> emptyGroups = new ArrayList<>();
                    for (Map.Entry<String, Set<String>> ge : groupMembers.entrySet()) {
                        Set<String> ms = ge.getValue();
                        if (ms == null || ms.isEmpty()) emptyGroups.add(ge.getKey());
                    }
                    for (String gid : emptyGroups) {
                        // Antes de eliminar, tomar snapshot de miembros para poder notificar
                        Set<String> membersSnapshot = groupMembers.remove(gid);
                        if (membersSnapshot != null && !membersSnapshot.isEmpty()) {
                            // Notificar que el grupo terminó a los miembros que queden (aunque normalmente está vacío)
                            for (String member : membersSnapshot) {
                                ObserverPrx prx = observers.get(member);
                                if (prx != null) {
                                    try {
                                        prx.groupCallEndedAsync(gid);
                                    } catch (Exception ignored) {}
                                }
                            }
                        } else {
                            // Si no hay miembros, igualmente emitir log
                            notifyGroupEnded(gid);
                        }
                    }
                }

            } catch (Exception ex) {
                ex.printStackTrace();
            }

        }, 30, 30, TimeUnit.SECONDS);
    }

    // --------------------- Attach / presence --------------------------
     @Override
    public synchronized void attach(String userId, ObserverPrx obs, Current c) {
        ObserverPrx proxy = obs.ice_fixed(c.con);
        observers.put(userId, proxy);
        lastSeen.put(userId, System.currentTimeMillis());

        System.out.println("[SERVER] Usuario conectado: " + userId);

        try {
            if (c.con != null) {
                c.con.setCloseCallback(con -> {
                    System.out.println("[SERVER] Close callback: " + userId + " desconectado.");
                    observers.remove(userId);
                    lastSeen.remove(userId);
                });
            }
        } catch (Exception ignored) {}
    }

    // --------------------- SEND AUDIO (llamada 1-a-1, tiempo real) -------
    @Override
    public synchronized void sendAudio(String fromUser, byte[] data, Current c) {
        if (fromUser == null) return;

        String target = activeCalls.get(fromUser);

        if (target == null) {
            System.out.println("[SERVER] " + fromUser + " no tiene receptor activo.");
            return;
        }

        if (data == null || data.length == 0) {
            System.out.println("[SERVER] Buffer vacío de audio.");
            return;
        }

        ObserverPrx prx = observers.get(target);
        if (prx == null) {
            System.out.println("[SERVER] El receptor ya no está conectado: " + target);
            // limpiar estado de llamada
            activeCalls.remove(fromUser);
            activeCalls.remove(target);
            return;
        }

        try {
            prx.receiveAudioAsync(data);
            // actualizar lastSeen de ambos
            lastSeen.put(fromUser, System.currentTimeMillis());
            lastSeen.put(target, System.currentTimeMillis());
            // log
            System.out.println("[SERVER] Audio enviado de " + fromUser + " -> " + target + " (bytes=" + data.length + ")");
        } catch (Exception e) {
            System.err.println("[SERVER] Error enviando audio: " + e);
        }
    }

    // --------------------- Mensaje de voz individual ---------------------
    @Override
    public synchronized void sendAudioMessage(String fromUser, String toUser, byte[] data, Current c) {
        if (toUser == null || fromUser == null) return;

        ObserverPrx dest = observers.get(toUser);

        if (dest == null) {
            System.out.println("[SERVER] sendAudioMessage: " + toUser + " no está conectado.");
            return;
        }

        if (data == null || data.length == 0) {
            System.out.println("[SERVER] sendAudioMessage: buffer vacío.");
            return;
        }

        try {
            dest.receiveAudioMessageAsync(data);
            System.out.println("[SERVER] Mensaje de audio enviado: " + fromUser + " -> " + toUser + " (bytes=" + data.length + ")");
        } catch (Exception e) {
            System.err.println("[SERVER] Error enviando audio message: " + e);
        }
    }

    // --------------------- Llamadas 1-a-1 -------------------------------
    @Override
    public synchronized void startCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] startCall: " + fromUser + " -> " + toUser);

        if (toUser == null || fromUser == null) return;

        ObserverPrx dest = observers.get(toUser);

        if (dest == null) {
            System.out.println("[SERVER] " + toUser + " no está conectado.");
            return;
        }

        try {
            dest.incomingCallAsync(fromUser);
            System.out.println("[SERVER] Notificación incomingCall enviada a " + toUser);
        } catch (Exception e) {
            System.err.println("[SERVER] Error enviando incomingCall: " + e);
        }
    }

    @Override
    public synchronized void acceptCall(String fromUser, String toUser, Current c) {
        // fromUser = el que llamó, toUser = el que contestó
        if (fromUser == null || toUser == null) return;

        System.out.println("[SERVER] acceptCall: " + fromUser + " <- " + toUser);

        ObserverPrx caller = observers.get(fromUser);

        if (caller == null) {
            System.out.println("[SERVER] El que llamó ya no está conectado.");
            return;
        }

        try {
            caller.callAcceptedAsync(toUser);
            System.out.println("[SERVER] Llamada aceptada notificada a " + fromUser);
        } catch (Exception e) {
            System.err.println("[SERVER] Error enviando callAccepted: " + e);
        }

        // registrar estado de llamada (bidireccional)
        activeCalls.put(fromUser, toUser);
        activeCalls.put(toUser, fromUser);
    }

    @Override
    public synchronized void rejectCall(String fromUser, String toUser, Current c) {
        System.out.println("[SERVER] rejectCall: " + fromUser + " <- " + toUser);

        if (fromUser == null || toUser == null) return;

        ObserverPrx caller = observers.get(fromUser);
        if (caller == null) return;

        try {
            caller.callRejectedAsync(toUser);
        } catch (Exception ignored) {}
    }

    @Override
    public synchronized void colgar(String fromUser, String toUser, Current c) {
        // fromUser = quien ejecuta colgar, toUser = peer (puede ser null)
        System.out.println("[SERVER] colgar: " + fromUser + " -> " + toUser);

        try {
            if (toUser != null) {
                ObserverPrx receiver = observers.get(toUser);
                if (receiver != null) {
                    try { receiver.callColgadaAsync(fromUser); } catch (Exception ignored) {}
                }
            }

            ObserverPrx caller = observers.get(fromUser);
            if (caller != null) {
                try { caller.callColgadaAsync(fromUser); } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}

        // limpiar estado de llamada si existía
        if (fromUser != null) activeCalls.remove(fromUser);
        if (toUser != null) activeCalls.remove(toUser);

        System.out.println("[SERVER] Colgar procesado para: " + fromUser + (toUser != null ? (" y " + toUser) : ""));
    }

    // --------------------- Usuarios conectados --------------------------
    @Override
    public synchronized String[] getConnectedUsers(Current current) {
        long now = System.currentTimeMillis();
        List<String> alive = new ArrayList<>();

        // Recorremos observers (fuente de verdad para usuarios conectados)
        for (Map.Entry<String, ObserverPrx> e : observers.entrySet()) {
            String user = e.getKey();
            Long seen = lastSeen.get(user);
            if (seen == null) {
                // si no hay lastSeen, considerarlo conectado y setear now
                lastSeen.put(user, now);
                alive.add(user);
            } else if (now - seen <= STALE_MS) {
                alive.add(user);
            } else {
                // usuario stale: limpiar
                observers.remove(user);
                lastSeen.remove(user);
            }
        }

        return alive.toArray(new String[0]);
    }

    public void shutdown() {
        cleaner.shutdownNow();
    }

    // --------------------- Llamadas grupales ---------------------------
    @Override
    public synchronized String createGroupCall(String fromUser, String[] users, Current current) {
        if (fromUser == null || users == null) {
            throw new IllegalArgumentException("fromUser/users no pueden ser null");
        }

        String groupId = "group-" + idGen.incrementAndGet();
        Set<String> members = ConcurrentHashMap.newKeySet();

        // agregar el creador + lista de usuarios solicitados (evitar nulos)
        members.add(fromUser);
        for (String u : users) {
            if (u != null && !u.trim().isEmpty()) members.add(u);
        }

        groupMembers.put(groupId, members);

        // Notificar a miembros que hay incomingGroupCall (usando snapshot)
        String[] arr = members.toArray(new String[0]);
        for (String member : arr) {
            ObserverPrx prx = observers.get(member);
            if (prx != null) {
                try {
                    prx.incomingGroupCallAsync(groupId, fromUser, arr);
                } catch (Exception ex) {
                    System.err.println("[SERVER] Error notificando incomingGroupCall a " + member + " : " + ex);
                }
            }
        }

        System.out.println("[SERVER] Grupo creado " + groupId + " por " + fromUser + " miembros=" + members);
        return groupId;
    }

    @Override
    public synchronized void joinGroupCall(String groupId, String user, Current current) {
        if (groupId == null || user == null) return;

        Set<String> members = groupMembers.get(groupId);
        if (members == null) {
            System.out.println("[SERVER] joinGroupCall: grupo no existe " + groupId);
            return;
        }

        members.add(user);
        notifyGroupUpdated(groupId);
        System.out.println("[SERVER] " + user + " se unió al grupo " + groupId);
    }

    @Override
    public synchronized void leaveGroupCall(String groupId, String user, Current current) {
        if (groupId == null || user == null) return;

        Set<String> members = groupMembers.get(groupId);
        if (members == null) return;

        members.remove(user);
        notifyGroupUpdated(groupId);
        System.out.println("[SERVER] " + user + " salió del grupo " + groupId);

        if (members.isEmpty()) {
            // tomar snapshot antes de eliminar
            Set<String> snapshot = groupMembers.remove(groupId);
            if (snapshot == null) snapshot = Collections.emptySet();
            // Notificar a snapshot (si hubiera alguno)
            for (String m : snapshot) {
                ObserverPrx prx = observers.get(m);
                if (prx != null) {
                    try { prx.groupCallEndedAsync(groupId); } catch (Exception ignored) {}
                }
            }
            System.out.println("[SERVER] Grupo vacío eliminado: " + groupId);
        }
    }

    @Override
    public synchronized void sendAudioGroup(String groupId, String fromUser, byte[] data, Current current) {
        if (groupId == null || fromUser == null) return;
        if (data == null || data.length == 0) return;

        Set<String> members = groupMembers.get(groupId);
        if (members == null || members.isEmpty()) {
            System.out.println("[SERVER] sendAudioGroup: grupo no existe o vacío: " + groupId);
            return;
        }

        // snapshot para iterar sin problemas
        String[] snapshot = members.toArray(new String[0]);
        for (String member : snapshot) {
            if (member.equals(fromUser)) continue;
            ObserverPrx prx = observers.get(member);
            if (prx == null) continue;
            try {
                prx.receiveAudioAsync(data);
            } catch (Exception ex) {
                System.err.println("[SERVER] Error enviando audio grupal a " + member + ": " + ex);
            }
        }

        // actualizar lastSeen del emisor
        lastSeen.put(fromUser, System.currentTimeMillis());
        System.out.println("[SERVER] Audio grupal enviado por " + fromUser + " al grupo " + groupId + " (bytes=" + data.length + ")");
    }

    // --------------------- Helpers para notificaciones grupales -------
    private void notifyGroupUpdated(String groupId) {
        Set<String> members = groupMembers.get(groupId);
        if (members == null) return;
        String[] arr = members.toArray(new String[0]);

        for (String member : arr) {
            ObserverPrx prx = observers.get(member);
            if (prx != null) {
                try {
                    prx.groupCallUpdatedAsync(groupId, arr);
                } catch (Exception ex) {
                    // ignorar
                }
            }
        }
    }

    private void notifyGroupEnded(String groupId) {
        // Intentamos obtener snapshot antes de cualquier modificación externa
        Set<String> members = groupMembers.get(groupId);
        if (members == null) return;

        String[] snapshot = members.toArray(new String[0]);

        for (String member : snapshot) {
            ObserverPrx prx = observers.get(member);
            if (prx != null) {
                try {
                    prx.groupCallEndedAsync(groupId);
                } catch (Exception ignored) {}
            }
        }
    }

    @Override
    public synchronized void sendAudioMessageGroup(String fromUser, String groupId, byte[] data, Current current) {
        if (groupId == null || fromUser == null) return;
        if (data == null || data.length == 0) return;

        Set<String> members = groupMembers.get(groupId);
        if (members == null || members.isEmpty()) {
            System.out.println("[SERVER] sendAudioMessageGroup: grupo no existe o vacío: " + groupId);
            return;
        }

        String[] snapshot = members.toArray(new String[0]);
        for (String member : snapshot) {
            if (member.equals(fromUser)) continue;
            ObserverPrx prx = observers.get(member);
            if (prx == null) continue;
            try {
                prx.receiveAudioMessageGroupAsync(groupId, data);
            } catch (Exception ex) {
                System.err.println("[SERVER] Error enviando mensaje de audio grupal a " + member + ": " + ex);
            }
        }

        // actualizar lastSeen del emisor
        lastSeen.put(fromUser, System.currentTimeMillis());
        System.out.println("[SERVER] Mensaje de audio grupal enviado por " + fromUser + " al grupo " + groupId + " (bytes=" + data.length + ")");
    }
}

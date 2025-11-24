package chat.handler;

import chat.model.Call;
import chat.model.Group;
import chat.model.Message;
import chat.model.VoiceNoteData;
import chat.protocol.Protocol;
import chat.protocol.Protocol.Command;
import chat.protocol.Protocol.Packet;
import chat.repository.GroupRepository;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class ClientRegistry {
    private final Map<Integer, ClientHandler> connectedClients = new ConcurrentHashMap<>();
    private final GroupRepository groupRepository;

    public ClientRegistry(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    public void register(int userId, ClientHandler handler) {
        connectedClients.put(userId, handler);
    }

    public void unregister(int userId) {
        connectedClients.remove(userId);
    }

    public ClientHandler get(int userId) {
        return connectedClients.get(userId);
    }

    public void notifyGroupMessage(Message message, int senderId) {
        groupRepository.findById(message.getGroupId()).ifPresent(group -> {
            for (int memberId : group.getMemberIds()) {
                if (memberId != senderId) {
                    ClientHandler member = connectedClients.get(memberId);
                    if (member != null) {
                        Packet notification = new Packet(Command.RECEIVE_MESSAGE, Protocol.toJson(message));
                        member.send(notification);
                    }
                }
            }
        });
    }

    public void notifyGroupVoiceNote(VoiceNoteData voiceNote, int senderId) {
        groupRepository.findById(voiceNote.getGroupId()).ifPresent(group -> {
            System.out.println("Enviando nota de voz a grupo " + voiceNote.getGroupId() +
                    " con " + group.getMemberIds().size() + " miembros");

            for (int memberId : group.getMemberIds()) {
                if (memberId != senderId) {
                    ClientHandler member = connectedClients.get(memberId);
                    if (member != null) {
                        Packet notification = new Packet(Command.VOICE_NOTE_DATA, Protocol.toJson(voiceNote));
                        member.send(notification);
                        System.out.println("Nota de voz enviada a miembro " + memberId);
                    } else {
                        System.out.println("Miembro " + memberId + " no esta conectado");
                    }
                }
            }
        });
    }

    public void notifyGroupCall(Call call, int callerId) {
        groupRepository.findById(call.getReceiverId()).ifPresent(group -> {
            for (int memberId : group.getMemberIds()) {
                if (memberId != callerId) {
                    ClientHandler member = connectedClients.get(memberId);
                    if (member != null) {
                        Packet notification = new Packet(Command.CALL_REQUEST, Protocol.toJson(call));
                        member.send(notification);
                    }
                }
            }
        });
    }
}

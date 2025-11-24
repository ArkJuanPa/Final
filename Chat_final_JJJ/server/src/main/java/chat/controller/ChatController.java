package chat.controller;

import chat.model.*;
import chat.protocol.Protocol;
import chat.protocol.Protocol.Command;
import chat.protocol.Protocol.Packet;
import chat.service.*;

import java.util.List;

public class ChatController {
    private final UserService userService;
    private final MessageService messageService;
    private final GroupService groupService;
    private final CallService callService;
    
    public ChatController(UserService userService, MessageService messageService, 
                         GroupService groupService, CallService callService) {
        this.userService = userService;
        this.messageService = messageService;
        this.groupService = groupService;
        this.callService = callService;
    }
    
    public Packet handleRegister(String username) {
        try {
            User user = userService.register(username);
            return new Packet(Command.SUCCESS, Protocol.toJson(user));
        } catch (Exception e) {
            return createErrorPacket(e.getMessage());
        }
    }
    
    public Packet handleLogin(String username) {
        try {
            User user = userService.login(username);
            return new Packet(Command.SUCCESS, Protocol.toJson(user));
        } catch (Exception e) {
            return createErrorPacket(e.getMessage());
        }
    }
    
    public void handleLogout(int userId) {
        userService.logout(userId);
    }
    
    public Packet handleSendMessage(Message message) {
        try {
            Message savedMessage = messageService.sendPrivateMessage(
                message.getSenderId(),
                message.getSenderUsername(),
                message.getReceiverId(),
                message.getContent()
            );
            return new Packet(Command.SUCCESS, "Mensaje enviado");
        } catch (Exception e) {
            return createErrorPacket(e.getMessage());
        }
    }
    
    public Packet handleSendGroupMessage(Message message) {
        try {
            Message savedMessage = messageService.sendGroupMessage(
                message.getSenderId(),
                message.getSenderUsername(),
                message.getGroupId(),
                message.getContent()
            );
            return new Packet(Command.SUCCESS, "Mensaje enviado al grupo");
        } catch (Exception e) {
            return createErrorPacket(e.getMessage());
        }
    }
    
    public Packet handleGetHistory(int userId1, int userId2) {
        List<Message> messages = messageService.getChatHistory(userId1, userId2);
        return new Packet(Command.SUCCESS, Protocol.toJson(messages));
    }
    
    public Packet handleGetGroupMessages(int groupId) {
        List<Message> messages = messageService.getGroupMessages(groupId);
        return new Packet(Command.SUCCESS, Protocol.toJson(messages));
    }
    
    public Packet handleCreateGroup(String name, int creatorId) {
        try {
            Group group = groupService.createGroup(name, creatorId);
            return new Packet(Command.SUCCESS, Protocol.toJson(group));
        } catch (Exception e) {
            return createErrorPacket(e.getMessage());
        }
    }
    
    public Packet handleGetUserGroups(int userId) {
        List<Group> groups = groupService.getUserGroups(userId);
        return new Packet(Command.SUCCESS, Protocol.toJson(groups));
    }
    
    public Packet handleAddToGroup(int groupId, int userId) {
        try {
            groupService.addMemberToGroup(groupId, userId);
            return new Packet(Command.SUCCESS, "Usuario agregado al grupo");
        } catch (Exception e) {
            return createErrorPacket(e.getMessage());
        }
    }
    
    public Packet handleGetUsers() {
        List<User> users = userService.getAllUsers();
        return new Packet(Command.SUCCESS, Protocol.toJson(users));
    }
    
    public void handleCallRequest(Call call) {
        callService.initiateCall(call);
    }
    
    public Packet handleCallAccept(int callerId, int receiverId) {
        callService.acceptCall(callerId, receiverId);
        return new Packet(Command.SUCCESS, "Llamada aceptada");
    }
    
    public Packet handleCallReject(int callerId, int receiverId) {
        callService.rejectCall(callerId, receiverId);
        return new Packet(Command.SUCCESS, "Llamada rechazada");
    }
    
    public Packet handleCallEnd(int userId) {
        callService.endCall(userId);
        return new Packet(Command.SUCCESS, "Llamada finalizada");
    }
    
    private Packet createErrorPacket(String error) {
        Packet packet = new Packet(Command.ERROR);
        packet.setError(error);
        return packet;
    }
}

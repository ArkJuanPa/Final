package chat.service.impl;

import chat.model.Message;
import chat.repository.MessageRepository;
import chat.service.MessageService;

import java.util.List;

public class MessageServiceImpl implements MessageService {
    private final MessageRepository messageRepository;
    
    public MessageServiceImpl(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }
    
    @Override
    public Message sendPrivateMessage(int senderId, String senderUsername, int receiverId, String content) {
        Message message = new Message(senderId, senderUsername, content);
        message.setReceiverId(receiverId);
        message.setType(Message.MessageType.TEXT);
        return messageRepository.save(message);
    }
    
    @Override
    public Message sendGroupMessage(int senderId, String senderUsername, int groupId, String content) {
        Message message = new Message(senderId, senderUsername, content);
        message.setGroupId(groupId);
        message.setType(Message.MessageType.TEXT);
        return messageRepository.save(message);
    }
    
    @Override
    public Message sendVoiceNote(int senderId, String senderUsername, int receiverId, int groupId, int duration) {
        String content = "Nota de voz (" + duration + " segundos)";
        Message message = new Message(senderId, senderUsername, content);
        message.setType(Message.MessageType.AUDIO);
        
        if (groupId > 0) {
            message.setGroupId(groupId);
        } else {
            message.setReceiverId(receiverId);
        }
        
        return messageRepository.save(message);
    }
    
    @Override
    public List<Message> getChatHistory(int userId1, int userId2) {
        return messageRepository.findByUsers(userId1, userId2);
    }
    
    @Override
    public List<Message> getGroupMessages(int groupId) {
        return messageRepository.findByGroupId(groupId);
    }
}

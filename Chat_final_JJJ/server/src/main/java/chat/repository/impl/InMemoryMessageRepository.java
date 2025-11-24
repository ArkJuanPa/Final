package chat.repository.impl;

import chat.model.Message;
import chat.repository.MessageRepository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class InMemoryMessageRepository implements MessageRepository {
    private final Map<Integer, List<Message>> messageHistory = new ConcurrentHashMap<>();
    private final AtomicInteger idCounter = new AtomicInteger(1);
    
    @Override
    public Message save(Message message) {
        if (message.getId() == 0) {
            message.setId(idCounter.getAndIncrement());
        }
        
        int key;
        if (message.getGroupId() != null && message.getGroupId() > 0) {
            key = message.getGroupId();
        } else if (message.getReceiverId() != null) {
            key = generateHistoryKey(message.getSenderId(), message.getReceiverId());
        } else {
            throw new IllegalStateException("Message must have either groupId or receiverId");
        }
        
        messageHistory.computeIfAbsent(key, k -> new ArrayList<>()).add(message);
        return message;
    }
    
    @Override
    public List<Message> findByUsers(int userId1, int userId2) {
        int key = generateHistoryKey(userId1, userId2);
        return new ArrayList<>(messageHistory.getOrDefault(key, new ArrayList<>()));
    }
    
    @Override
    public List<Message> findByGroupId(int groupId) {
        int key = groupId;
        return new ArrayList<>(messageHistory.getOrDefault(key, new ArrayList<>()));
    }
    
    private int generateHistoryKey(int userId1, int userId2) {
        return userId1 < userId2 ? 
            (userId1 * 10000 + userId2) : 
            (userId2 * 10000 + userId1);
    }
}

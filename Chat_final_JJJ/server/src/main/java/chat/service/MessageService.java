package chat.service;

import chat.model.Message;
import java.util.List;

public interface MessageService {
    Message sendPrivateMessage(int senderId, String senderUsername, int receiverId, String content);
    Message sendGroupMessage(int senderId, String senderUsername, int groupId, String content);
    Message sendVoiceNote(int senderId, String senderUsername, int receiverId, int groupId, int duration);
    List<Message> getChatHistory(int userId1, int userId2);
    List<Message> getGroupMessages(int groupId);
}

package chat.repository;

import chat.model.Message;
import java.util.List;

public interface MessageRepository {
    Message save(Message message);
    List<Message> findByUsers(int userId1, int userId2);
    List<Message> findByGroupId(int groupId);
}

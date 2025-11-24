package chat.repository.impl;

import chat.config.DatabaseConfig;
import chat.model.Message;
import chat.repository.MessageRepository;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class PostgresMessageRepository implements MessageRepository {
    private final DatabaseConfig dbConfig;
    
    public PostgresMessageRepository() {
        this.dbConfig = DatabaseConfig.getInstance();
    }
    
    @Override
    public Message save(Message message) {
        String sql = "INSERT INTO messages (sender_id, sender_username, receiver_id, group_id, content, message_type) " +
                     "VALUES (?, ?, ?, ?, ?, ?) RETURNING id, timestamp";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, message.getSenderId());
            stmt.setString(2, message.getSenderUsername());
            
            if (message.getReceiverId() != null && message.getReceiverId() > 0) {
                stmt.setInt(3, message.getReceiverId());
            } else {
                stmt.setNull(3, Types.INTEGER);
            }
            
            if (message.getGroupId() != null && message.getGroupId() > 0) {
                stmt.setInt(4, message.getGroupId());
            } else {
                stmt.setNull(4, Types.INTEGER);
            }
            
            stmt.setString(5, message.getContent());
            stmt.setString(6, message.getType().name());
            
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                message.setId(rs.getInt("id"));
                message.setTimestamp(rs.getTimestamp("timestamp").toLocalDateTime());
            }
            
            return message;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error saving message", e);
        }
    }
    
    @Override
    public List<Message> findByUsers(int userId1, int userId2) {
        String sql = "SELECT * FROM messages " +
                     "WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) " +
                     "ORDER BY timestamp ASC";
        List<Message> messages = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, userId1);
            stmt.setInt(2, userId2);
            stmt.setInt(3, userId2);
            stmt.setInt(4, userId1);
            
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                messages.add(mapResultSetToMessage(rs));
            }
            
            return messages;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding messages by users", e);
        }
    }
    
    @Override
    public List<Message> findByGroupId(int groupId) {
        String sql = "SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC";
        List<Message> messages = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, groupId);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                messages.add(mapResultSetToMessage(rs));
            }
            
            return messages;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding messages by group", e);
        }
    }
    
    private Message mapResultSetToMessage(ResultSet rs) throws SQLException {
        Message message = new Message(
            rs.getInt("sender_id"),
            rs.getString("sender_username"),
            rs.getString("content")
        );
        
        message.setId(rs.getInt("id"));
        
        int receiverId = rs.getInt("receiver_id");
        if (!rs.wasNull()) {
            message.setReceiverId(receiverId);
        }
        
        int groupId = rs.getInt("group_id");
        if (!rs.wasNull()) {
            message.setGroupId(groupId);
        }
        
        message.setType(Message.MessageType.valueOf(rs.getString("message_type")));
        message.setTimestamp(rs.getTimestamp("timestamp").toLocalDateTime());
        
        return message;
    }
}

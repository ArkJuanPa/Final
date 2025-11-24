package chat.model;

import java.io.Serializable;
import java.time.LocalDateTime;

public class Message implements Serializable {
    private static final long serialVersionUID = 1L;
    
    public enum MessageType {
        TEXT, AUDIO, IMAGE, VIDEO, CALL_REQUEST, CALL_ACCEPT, CALL_REJECT, CALL_END
    }
    
    private int id;
    private int senderId;
    private String senderUsername;
    private Integer receiverId;  
    private Integer groupId;     
    private String content;
    private MessageType type;
    private LocalDateTime timestamp;
    private boolean delivered;
    private boolean read;
    
    public Message() {
        this.timestamp = LocalDateTime.now();
        this.type = MessageType.TEXT;
        this.delivered = false;
        this.read = false;
    }
    
    public Message(int senderId, String senderUsername, String content) {
        this();
        this.senderId = senderId;
        this.senderUsername = senderUsername;
        this.content = content;
    }
    
 
    public int getId() {
        return id;
    }
    
    public void setId(int id) {
        this.id = id;
    }
    
    public int getSenderId() {
        return senderId;
    }
    
    public void setSenderId(int senderId) {
        this.senderId = senderId;
    }
    
    public String getSenderUsername() {
        return senderUsername;
    }
    
    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }
    
    public Integer getReceiverId() {
        return receiverId;
    }
    
    public void setReceiverId(Integer receiverId) {
        this.receiverId = receiverId;
    }
    
    public Integer getGroupId() {
        return groupId;
    }
    
    public void setGroupId(Integer groupId) {
        this.groupId = groupId;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public MessageType getType() {
        return type;
    }
    
    public void setType(MessageType type) {
        this.type = type;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public boolean isDelivered() {
        return delivered;
    }
    
    public void setDelivered(boolean delivered) {
        this.delivered = delivered;
    }
    
    public boolean isRead() {
        return read;
    }
    
    public void setRead(boolean read) {
        this.read = read;
    }
    
    @Override
    public String toString() {
        String typeIcon = getTypeIcon();
        return String.format("[%s] %s %s: %s", 
            timestamp.toLocalTime().toString().substring(0, 5),
            senderUsername,
            typeIcon,
            content);
    }
    
    private String getTypeIcon() {
        switch (type) {
            case AUDIO: return "🎤";
            case IMAGE: return "📷";
            case VIDEO: return "🎥";
            case CALL_REQUEST: return "📞";
            default: return "";
        }
    }
}

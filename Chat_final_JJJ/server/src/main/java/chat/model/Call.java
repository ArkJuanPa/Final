package chat.model;

import java.io.Serializable;
import java.time.LocalDateTime;

public class Call implements Serializable {
    private static final long serialVersionUID = 1L;
    
    public enum CallStatus {
        RINGING, ACTIVE, ENDED, MISSED, REJECTED
    }
    
    private int id;
    private int callerId;
    private String callerUsername;
    private int receiverId;
    private String receiverUsername;
    private boolean isGroupCall;
    private CallStatus status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private int durationSeconds;
    
    public Call() {
        this.startTime = LocalDateTime.now();
        this.status = CallStatus.RINGING;
        this.isGroupCall = false;
    }
    
    public Call(int callerId, String callerUsername, int receiverId, String receiverUsername) {
        this();
        this.callerId = callerId;
        this.callerUsername = callerUsername;
        this.receiverId = receiverId;
        this.receiverUsername = receiverUsername;
    }
    
    public int getId() {
        return id;
    }
    
    public void setId(int id) {
        this.id = id;
    }
    
    public void setCallId(int id) {
        this.id = id;
    }
    
    public int getCallerId() {
        return callerId;
    }
    
    public void setCallerId(int callerId) {
        this.callerId = callerId;
    }
    
    public String getCallerUsername() {
        return callerUsername;
    }
    
    public void setCallerUsername(String callerUsername) {
        this.callerUsername = callerUsername;
    }
    
    public int getReceiverId() {
        return receiverId;
    }
    
    public void setReceiverId(int receiverId) {
        this.receiverId = receiverId;
    }
    
    public String getReceiverUsername() {
        return receiverUsername;
    }
    
    public void setReceiverUsername(String receiverUsername) {
        this.receiverUsername = receiverUsername;
    }
    
    public CallStatus getStatus() {
        return status;
    }
    
    public void setStatus(CallStatus status) {
        this.status = status;
    }
    
    public LocalDateTime getStartTime() {
        return startTime;
    }
    
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }
    
    public LocalDateTime getEndTime() {
        return endTime;
    }
    
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
    
    public int getDurationSeconds() {
        return durationSeconds;
    }
    
    public void setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
    }
    
    public boolean isGroupCall() {
        return isGroupCall;
    }
    
    public void setGroupCall(boolean groupCall) {
        isGroupCall = groupCall;
    }
    
    @Override
    public String toString() {
        String type = isGroupCall ? "Llamada grupal" : "Llamada";
        return String.format("%s: %s -> %s [%s] (%ds)", 
            type, callerUsername, receiverUsername, status, durationSeconds);
    }
}

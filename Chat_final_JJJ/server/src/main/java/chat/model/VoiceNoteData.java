package chat.model;

import java.util.Base64;

public class VoiceNoteData {
    private int senderId;
    private int receiverId;
    private Integer groupId;
    private String audioData; 
    private int durationSeconds;

    public VoiceNoteData(int senderId, int receiverId, byte[] audioBytes, int durationSeconds) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.audioData = Base64.getEncoder().encodeToString(audioBytes);
        this.durationSeconds = durationSeconds;
    }

    public VoiceNoteData(int senderId, int groupId, byte[] audioBytes, int durationSeconds, boolean isGroup) {
        this.senderId = senderId;
        this.groupId = groupId;
        this.audioData = Base64.getEncoder().encodeToString(audioBytes);
        this.durationSeconds = durationSeconds;
    }

    public int getSenderId() {
        return senderId;
    }

    public int getReceiverId() {
        return receiverId;
    }

    public Integer getGroupId() {
        return groupId;
    }

    public byte[] getAudioBytes() {
        return Base64.getDecoder().decode(audioData);
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public boolean isGroupMessage() {
        return groupId != null;
    }
}

package chat.service;

import chat.model.Call;

public interface CallService {
    void initiateCall(Call call);
    void acceptCall(int callerId, int receiverId);
    void rejectCall(int callerId, int receiverId);
    void endCall(int userId);
}

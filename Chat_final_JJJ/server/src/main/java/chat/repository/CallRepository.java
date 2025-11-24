package chat.repository;

import chat.model.Call;
import java.util.List;
import java.util.Optional;

public interface CallRepository {
    Call save(Call call);
    Optional<Call> findById(int id);
    List<Call> findByUserId(int userId);
    List<Call> findByGroupId(int groupId);
    void updateCallStatus(int callId, String status);
    void endCall(int callId, int durationSeconds);
}

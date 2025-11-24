package chat.service.impl;

import chat.model.Call;
import chat.repository.CallRepository;
import chat.service.CallService;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CallServiceImpl implements CallService {
    private final Map<Integer, Call> activeCalls = new ConcurrentHashMap<>();
    private final CallRepository callRepository;

    public CallServiceImpl(CallRepository callRepository) {
        this.callRepository = callRepository;
    }

    @Override
    public void initiateCall(Call call) {
        call.setStatus(Call.CallStatus.RINGING);
        callRepository.save(call);
    }

    @Override
    public void acceptCall(int callerId, int receiverId) {
        Call call = new Call(callerId, "", receiverId, "");
        call.setStatus(Call.CallStatus.ACTIVE);
        call.setStartTime(LocalDateTime.now());
        activeCalls.put(callerId, call);
        activeCalls.put(receiverId, call);
    }

    @Override
    public void rejectCall(int callerId, int receiverId) {
        callRepository.findByUserId(callerId).stream()
            .filter(c -> c.getReceiverId() == receiverId && c.getStatus() == Call.CallStatus.RINGING)
            .findFirst()
            .ifPresent(call -> callRepository.updateCallStatus(call.getId(), "REJECTED"));
    }

    @Override
    public void endCall(int userId) {
        Call call = activeCalls.remove(userId);

        if (call != null) {
            int otherUserId = (call.getCallerId() == userId)
                    ? call.getReceiverId()
                    : call.getCallerId();

            activeCalls.remove(otherUserId);
            call.setEndTime(LocalDateTime.now());

            if (call.getStartTime() != null) {

                // Calcula la duración en segundos entre inicio y fin
                long durationSeconds = ChronoUnit.SECONDS.between(call.getStartTime(), call.getEndTime());

                // Guarda en el objeto y en base de datos
                call.setDurationSeconds((int) durationSeconds);
                callRepository.endCall(call.getId(), call.getDurationSeconds());
            }
        }
    }

}

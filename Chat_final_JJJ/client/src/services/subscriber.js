// ===================== Subscriber.js =====================

export default class Subscriber extends Demo.Observer {
    constructor(delegate) {
        super();
        this.delegate = delegate;
    }

    // =================== AUDIO ===================
    receiveAudio(bytes) {
        console.log("[WEB] Audio recibido:", bytes.length);
        this.delegate.notify(Uint8Array.from(bytes));
    }

    receiveAudioMessage(bytes) {
        console.log("[WEB] Mensaje de audio recibido:", bytes.length);
        this.delegate.notify(Uint8Array.from(bytes));
    }

    receiveAudioMessageGroup(groupId, bytes) {
        console.log(`[WEB] Audio de mensaje grupal recibido en ${groupId} (${bytes.length})`);
        this.delegate.notifyGroupMessage(groupId, Uint8Array.from(bytes));
    }

    // =================== LLAMADAS 1 a 1 ===================
    incomingCall(fromUser) {
        console.log("📞 incomingCall:", fromUser);
        this.delegate.notifyIncomingCall(fromUser);
    }

    callAccepted(fromUser) {
        console.log("✅ callAccepted:", fromUser);
        this.delegate.notifyCallAccepted(fromUser);
    }

    callRejected(fromUser) {
        console.log("❌ callRejected:", fromUser);
        this.delegate.notifyCallRejected(fromUser);
    }

    callColgada(fromUser) {
        console.log("📴 callColgada:", fromUser);
        this.delegate.notifyCallColgada(fromUser);
    }

    // =================== LLAMADAS GRUPALES ===================
    incomingGroupCall(groupId, fromUser, members) {
        console.log(`📢 incomingGroupCall (${groupId}) de ${fromUser}`);
        this.delegate.notifyIncomingGroupCall(groupId, fromUser, members);
    }

    groupCallUpdated(groupId, members) {
        console.log(`🔄 groupCallUpdated (${groupId})`);
        this.delegate.notifyGroupCallUpdated(groupId, members);
    }

    groupCallEnded(groupId) {
        console.log(`🛑 groupCallEnded (${groupId})`);
        this.delegate.notifyGroupCallEnded(groupId);
    }
}

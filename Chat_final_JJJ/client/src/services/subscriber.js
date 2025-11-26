

// ===================== Subscriber.js =====================

class Subscriber extends Demo.Observer {
  constructor(delegate) {
    super();
    this.delegate = delegate;
  }

  // =================== AUDIO ===================
  receiveAudio(bytes) {
    console.log("[WEB] 🔊 Audio recibido:", bytes.length);
    this.delegate.notify(Uint8Array.from(bytes));
  }

  receiveAudioMessage(bytes) {
    console.log("[WEB] 📨 Mensaje de audio recibido:", bytes.length);
    this.delegate.notify(Uint8Array.from(bytes));
  }

  receiveAudioMessageGroup(groupId, bytes) {
    console.log(`[WEB] 📨 Audio de mensaje grupal recibido en ${groupId} (${bytes.length})`);
    this.delegate.notifyGroupMessage(groupId, Uint8Array.from(bytes));
  }
  
  groupUsersUpdated(groupId, users, current) {
      console.log("[WEB] 👥 Lista de usuarios actualizada en grupo:", groupId);
      console.log("Usuarios:", users);

      // Si tienes un delegado o manejador UI
      if (this.delegate && typeof this.delegate.onGroupUsersUpdated === "function") {
          this.delegate.onGroupUsersUpdated(groupId, users);
      }
  }

  // =================== LLAMADAS 1 a 1 ===================
  incomingCall(fromUser) {
    console.log("[WEB] 📞 incomingCall:", fromUser);
    this.delegate.notifyIncomingCall(fromUser);
  }

  callAccepted(fromUser) {
    console.log("[WEB] ✅ callAccepted:", fromUser);
    this.delegate.notifyCallAccepted(fromUser);
  }

  callRejected(fromUser) {
    console.log("[WEB] ❌ callRejected:", fromUser);
    this.delegate.notifyCallRejected(fromUser);
  }

  callColgada(fromUser) {
    console.log("[WEB] 📴 callColgada:", fromUser);
    this.delegate.notifyCallColgada(fromUser);
  }

  // =================== LLAMADAS GRUPALES ===================
  incomingGroupCall(groupId, fromUser, members) {
    console.log(`[WEB] 📢 incomingGroupCall (${groupId}) de ${fromUser}`);
    this.delegate.notifyIncomingGroupCall(groupId, fromUser, members);
  }

  groupCallUpdated(groupId, members) {
    console.log(`[WEB] 🔄 groupCallUpdated (${groupId})`);
    this.delegate.notifyGroupCallUpdated(groupId, members);
  }

  groupCallEnded(groupId) {
    console.log(`[WEB] 🛑 groupCallEnded (${groupId})`);
    this.delegate.notifyGroupCallEnded(groupId);
  }
}

export default Subscriber;
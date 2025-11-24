
export default class Subscriber extends Demo.Observer {
  constructor(delegate) {
    super();
    this.delegate = delegate;
  }

  receiveAudio(bytes) {
    console.log("[WEB] Audio recibido:", bytes.length);
    const raw = Uint8Array.from(bytes);
    this.delegate.notify(raw);
  }

  receiveAudioMessage(bytes) {
    console.log("[WEB] Mensaje de audio:", bytes.length);
    const raw = Uint8Array.from(bytes);
    this.delegate.notify(raw);
  }

  incomingCall(fromUser) {
    console.log("📞 incomingCall recibido:", fromUser);
    if (this.delegate.incomingCallCB) this.delegate.incomingCallCB(fromUser);
  }

  callAccepted(byUser) {
    console.log("✅ Llamada aceptada por:", byUser);
    if (this.delegate.callAcceptedCB) this.delegate.callAcceptedCB(byUser);
  }

  callRejected(byUser) {
    console.log("❌ Llamada rechazada por:", byUser);
    if (this.delegate.callRejectedCB) this.delegate.callRejectedCB(byUser);
  }

  // ----------------- Llamada colgada -----------------
  callColgada(byUser) {
    console.log("📴 Llamada colgada por:", byUser);

    // Notifica al IceDelegate para manejar el flujo
    this.delegate.notifyCallColgada(byUser);
  }
}

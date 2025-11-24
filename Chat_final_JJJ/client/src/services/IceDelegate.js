// ===================== IceDelegate.js =====================
import Subscriber from "./Subscriber.js";

class IceDelegate {
  constructor() {
    this.communicator = Ice.initialize();
    this.subject = null;

    this.name = null;
    this.currentCall = null;

    this.subscriber = new Subscriber(this);

    // callbacks de audio
    this.callbacks = [];
    this.groupCallbacks = new Map(); // groupId → callbacks[]

    // callbacks de llamadas
    this.incomingCallCB = null;
    this.callAcceptedCB = null;
    this.callRejectedCB = null;
    this.callColgadaCB = null;

    // callbacks grupales
    this.incomingGroupCallCB = null;
    this.groupUpdatedCB = null;
    this.groupEndedCB = null;
  }

  // ============================================================
  // INIT
  // ============================================================
  async init(name) {
    this.name = name;
    if (this.subject) return;

    const proxy = this.communicator.stringToProxy(
      `AudioService:ws -h localhost -p 9099`
    );

    this.subject = await Demo.SubjectPrx.checkedCast(proxy);
    if (!this.subject) return console.error("❌ No pude castear SubjectPrx");

    const adapter = await this.communicator.createObjectAdapter("");
    await adapter.activate();

    const conn = this.subject.ice_getCachedConnection();
    conn.setAdapter(adapter);

    const callbackPrx = Demo.ObserverPrx.uncheckedCast(
      adapter.addWithUUID(this.subscriber)
    );

    await this.subject.attach(this.name, callbackPrx);

    console.log("✅ ICE Delegate listo como:", this.name);
  }

  // ============================================================
  // USUARIOS
  // ============================================================
  async getUsers() {
    if (!this.subject) return [];
    return await this.subject.getConnectedUsers();
  }

  // ============================================================
  // LLAMADAS NORMALES
  // ============================================================
  async startCall(target) {
    if (!this.subject) return;
    await this.subject.startCall(this.name, target);
    this.currentCall = target;
  }

  async acceptCall(fromUser) {
    if (!this.subject) return;
    await this.subject.acceptCall(fromUser, this.name);
    this.currentCall = fromUser;
  }

  async rejectCall(fromUser) {
    if (!this.subject) return;
    await this.subject.rejectCall(fromUser, this.name);
  }

  async colgar(target) {
    if (!this.subject) return;
    await this.subject.colgar(this.name, target);
    if (this.currentCall === target) this.currentCall = null;
  }

  // ============================================================
  // AUDIO (LLAMADA 1 A 1)
  // ============================================================
  async sendAudio(byteArray) {
    if (!this.subject) return;
    const data = Uint8Array.from(byteArray);
    await this.subject.sendAudio(this.name, data);
  }

  // ============================================================
  // MENSAJES DE AUDIO
  // ============================================================
  async sendAudioMessage(targetUser, byteArray) {
    const data = Uint8Array.from(byteArray);
    await this.subject.sendAudioMessage(this.name, targetUser, data);
  }

  // ============================================================
  // GRUPOS: INICIAR / UNIR / SALIR
  // ============================================================
  async createGroupCall(users) {
    return await this.subject.createGroupCall(this.name, users);
  }

  async joinGroupCall(groupId) {
    await this.subject.joinGroupCall(groupId, this.name);
  }

  async leaveGroupCall(groupId) {
    await this.subject.leaveGroupCall(groupId, this.name);
  }

  // ============================================================
  // AUDIO GRUPAL
  // ============================================================
  async sendAudioGroup(groupId, byteArray) {
    const data = Uint8Array.from(byteArray);
    await this.subject.sendAudioGroup(groupId, this.name, data);
  }

  async sendAudioMessageGroup(groupId, byteArray) {
    const data = Uint8Array.from(byteArray);
    await this.subject.sendAudioMessageGroup(this.name, groupId, data);
  }

  // ============================================================
  // SUBSCRIPCIÓN DE AUDIO
  // ============================================================
  subscribe(cb) {
    this.callbacks.push(cb);
  }

  subscribeGroup(groupId, cb) {
    if (!this.groupCallbacks.has(groupId))
      this.groupCallbacks.set(groupId, []);
    this.groupCallbacks.get(groupId).push(cb);
  }

  notify(bytes) {
    this.callbacks.forEach(cb => cb(bytes));
  }

  notifyGroupMessage(groupId, bytes) {
    if (!this.groupCallbacks.has(groupId)) return;
    this.groupCallbacks.get(groupId).forEach(cb => cb(bytes));
  }

  // ============================================================
  // CALLBACKS DE LLAMADAS
  // ============================================================
  onIncomingCall(cb) { this.incomingCallCB = cb; }
  onCallAccepted(cb) { this.callAcceptedCB = cb; }
  onCallRejected(cb) { this.callRejectedCB = cb; }
  onCallColgada(cb) { this.callColgadaCB = cb; }

  notifyIncomingCall(fromUser) {
    if (this.incomingCallCB) this.incomingCallCB(fromUser);
  }

  notifyCallAccepted(fromUser) {
    if (this.callAcceptedCB) this.callAcceptedCB(fromUser);
  }

  notifyCallRejected(fromUser) {
    if (this.callRejectedCB) this.callRejectedCB(fromUser);
  }

  notifyCallColgada(fromUser) {
    if (this.currentCall === fromUser) this.currentCall = null;
    if (this.callColgadaCB) this.callColgadaCB(fromUser);
  }

  // ============================================================
  // CALLBACKS GRUPALES
  // ============================================================
  onIncomingGroupCall(cb) { this.incomingGroupCallCB = cb; }
  onGroupUpdated(cb) { this.groupUpdatedCB = cb; }
  onGroupEnded(cb) { this.groupEndedCB = cb; }

  notifyIncomingGroupCall(groupId, fromUser, members) {
    if (this.incomingGroupCallCB)
      this.incomingGroupCallCB(groupId, fromUser, members);
  }

  notifyGroupCallUpdated(groupId, members) {
    if (this.groupUpdatedCB)
      this.groupUpdatedCB(groupId, members);
  }

  notifyGroupCallEnded(groupId) {
    if (this.groupEndedCB)
      this.groupEndedCB(groupId);
  }
}

const instance = new IceDelegate();
export default instance;

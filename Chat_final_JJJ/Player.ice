module Demo {
    sequence<byte> Bytes;
    sequence<string> stringSeq;

    interface Observer {
        // Audio (llamadas y mensajes)
        void receiveAudio(Bytes data);
        void receiveAudioMessage(Bytes data);
        void receiveAudioMessageGroup(string groupId, Bytes data);



        // Llamadas individuales
        void incomingCall(string fromUser);
        void callAccepted(string fromUser);
        void callRejected(string fromUser);
        void callColgada(string fromUser);

        // Llamadas grupales
        void incomingGroupCall(string groupId, string fromUser, stringSeq members);
        void groupCallUpdated(string groupId, stringSeq members);
        void groupCallEnded(string groupId);
    };

    interface Subject {
        void attach(string userId, Observer* obs);

        // Audio
        void sendAudio(string fromUser, Bytes data); // llamada normal 1 a 1
        void sendAudioMessage(string fromUser, string toUser, Bytes data); // mensaje de voz individual

        stringSeq getConnectedUsers();

        // Llamadas individuales
        void startCall(string fromUser, string toUser);
        void acceptCall(string fromUser, string toUser);
        void rejectCall(string fromUser, string toUser);
        void colgar(string fromUser, string toUser);

        // Llamadas grupales
        string createGroupCall(string fromUser, stringSeq users);
        void joinGroupCall(string groupId, string user);
        void leaveGroupCall(string groupId, string user);
        void sendAudioMessageGroup(string fromUser, string groupId, Bytes data);
        void sendAudioGroup(string groupId, string fromUser, Bytes data); // audio de llamada grupal
    };
}

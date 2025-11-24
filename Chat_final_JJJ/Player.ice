module Demo {
    sequence<byte> Bytes;
    sequence<string> stringSeq;

    interface Observer {
        void receiveAudio(Bytes data);
        void receiveAudioMessage(Bytes data);

        // llamadas
        void incomingCall(string fromUser);
        void callAccepted(string fromUser);
        void callRejected(string fromUser);
        void callColgada(string fromUser);
    };

    interface Subject {
        void attach(string userId, Observer* obs);

        void sendAudio(string fromUser, Bytes data);
        void sendAudioMessage(string fromUser, string toUser, Bytes data);

        stringSeq getConnectedUsers();

        // Llamadas
        void startCall(string fromUser, string toUser);
        void acceptCall(string fromUser, string toUser);
        void rejectCall(string fromUser, string toUser);
        void colgar(string fromUser, string toUser);
    };
}

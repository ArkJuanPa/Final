package chat.client;

import chat.model.*;
import chat.protocol.Protocol;
import chat.protocol.Protocol.Command;
import chat.protocol.Protocol.Packet;
import com.google.gson.reflect.TypeToken;

import javax.sound.sampled.LineUnavailableException;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

public class ChatClient {
    private static final String SERVER_HOST = "localhost";
    private static final int SERVER_PORT = 5000;

    private Socket socket;
    private BufferedReader in;
    private PrintWriter out;
    private Scanner scanner;
    private User currentUser;
    private boolean running = true;
    private VoiceClient voiceClient;
    private final Object scannerLock = new Object();
    private AtomicBoolean processingOperation = new AtomicBoolean(false);

    private volatile Call pendingIncomingCall = null;

    private AtomicBoolean inCall = new AtomicBoolean(false);
    private volatile Call currentCall = null;

    public ChatClient() {
        scanner = new Scanner(System.in);
    }

    public void start() {
        try {
            socket = new Socket(SERVER_HOST, SERVER_PORT);
            in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            out = new PrintWriter(socket.getOutputStream(), true);

            // Iniciar hilo para recibir mensajes
            new Thread(this::receiveMessages).start();

            showWelcome();
            authenticate();

            if (currentUser != null) {
                voiceClient = new VoiceClient(currentUser.getId());
                showMainMenu();
            }

        } catch (IOException e) {
            System.err.println("Error conectando al servidor: " + e.getMessage());
        } catch (LineUnavailableException e) {
            throw new RuntimeException(e);
        } finally {
            disconnect();
        }
    }

    private void showWelcome() {
        System.out.println("\n========================================");
        System.out.println("       CHAT CLI - Estilo WhatsApp       ");
        System.out.println("========================================\n");
    }

    private void authenticate() {
        while (currentUser == null) {
            System.out.println("1. Iniciar sesion");
            System.out.println("2. Registrarse");
            System.out.println("3. Salir");
            System.out.print("\nSeleccione una opcion: ");

            String option;
            synchronized (scannerLock) {
                if (!scanner.hasNextLine()) {
                    running = false; // Exit if input stream is closed
                    return;
                }
                option = scanner.nextLine();
            }

            switch (option) {
                case "1":
                    login();
                    break;
                case "2":
                    register();
                    break;
                case "3":
                    running = false;
                    return;
                default:
                    System.out.println("Opción invalida");
            }
        }
    }

    private void login() {
        System.out.print("\nNombre de usuario: ");
        String username;
        synchronized (scannerLock) {
            username = scanner.nextLine();
        }

        Packet packet = new Packet(Command.LOGIN, username);
        sendPacket(packet);
    }

    private void register() {
        System.out.print("\nNombre de usuario: ");
        String username;
        synchronized (scannerLock) {
            username = scanner.nextLine();
        }

        Packet packet = new Packet(Command.REGISTER, username);
        sendPacket(packet);
    }

    private void showMainMenu() {
        while (running) {

            // Si hay una llamada entrante, NO mostrar menú
            if (pendingIncomingCall != null) {
                System.out.println("\nLLAMADA ENTRANTE de " + pendingIncomingCall.getCallerUsername());
                System.out.print("¿Aceptar la llamada? (S / N): ");
            }
            else if (!inCall.get() && !processingOperation.get()) {
                System.out.println("\n========================================");
                System.out.println("  Bienvenido, " + currentUser.getUsername() + "!");
                System.out.println("========================================");
                System.out.println("\n1. Enviar mensaje privado");
                System.out.println("2. Ver historial de chat");
                System.out.println("3. Crear grupo");
                System.out.println("4. Ver mis grupos");
                System.out.println("5. Agregar miembro a grupo");
                System.out.println("6. Enviar mensaje a grupo");
                System.out.println("7. Ver mensajes de grupo");
                System.out.println("8. Realizar llamada");
                System.out.println("9. Enviar nota de voz");
                System.out.println("10. Ver usuarios");
                System.out.println("11. Cerrar sesion");
                System.out.print("\nSeleccione una opcion: ");
            }

            if (inCall.get() || processingOperation.get()) {
                try {
                    Thread.sleep(100);
                } catch (InterruptedException e) {
                    break;
                }
                continue;
            }

            String option;
            synchronized (scannerLock) {
                if (!scanner.hasNextLine()) {
                    running = false;
                    break;
                }
                option = scanner.nextLine().trim();
            }

            // Manejo especial para llamadas
            if (pendingIncomingCall != null) {
                if (option.equalsIgnoreCase("S")) {
                    Call call = pendingIncomingCall;
                    pendingIncomingCall = null;

                    currentCall = call;
                    inCall.set(true);

                    Packet accept = new Packet(Command.CALL_ACCEPT, Protocol.toJson(call));
                    sendPacket(accept);

                    System.out.println(" -- Llamada aceptada. Conectando... --");
                    voiceClient.startCall(call.getCallerId());

                    System.out.println("En llamada. Presiona ENTER para colgar...");

                    new Thread(() -> {
                        try {
                            synchronized (scannerLock) {
                                scanner.nextLine();
                            }
                            // Usuario presionó ENTER
                            if (inCall.get()) {
                                endCurrentCall();
                            }
                        } catch (Exception e) {
                            // Ignorar interrupciones
                        }
                    }).start();

                    continue;
                }

                if (option.equalsIgnoreCase("N")) {
                    Call call = pendingIncomingCall;
                    pendingIncomingCall = null;

                    Packet reject = new Packet(Command.CALL_REJECT, Protocol.toJson(call));
                    sendPacket(reject);

                    System.out.println("Llamada rechazada");
                    continue;
                }

                System.out.println("Respuesta invalida. ¿Aceptar la llamada? (S / N)");
                continue;
            }

            processingOperation.set(true);

            // Si no hay llamada entrante
            switch (option) {
                case "1":
                    sendPrivateMessage();
                    break;
                case "2":
                    viewChatHistory();
                    break;
                case "3":
                    createGroup();
                    break;
                case "4":
                    viewMyGroups();
                    break;
                case "5":
                    addMemberToGroup();
                    break;
                case "6":
                    sendGroupMessage();
                    break;
                case "7":
                    viewGroupMessages();
                    break;
                case "8":
                    makeCall();
                    break;
                case "9":
                    sendVoiceNote();
                    break;
                case "10":
                    viewUsers();
                    break;
                case "11":
                    logout();
                    return;
                default:
                    System.out.println("Opción inválida");
            }

            processingOperation.set(false);
        }
    }

    private void endCurrentCall() {
        if (!inCall.get()) {
            return; // Ya terminó
        }

        inCall.set(false);
        voiceClient.endCall();

        if (currentCall != null) {
            Packet endPacket = new Packet(Command.CALL_END, Protocol.toJson(currentCall));
            sendPacket(endPacket);
            currentCall = null;
        }

        System.out.println("\nLlamada finalizada.");
    }

    private void sendPrivateMessage() {
        System.out.print("\nID del destinatario: ");
        String receiverIdStr;
        synchronized (scannerLock) {
            receiverIdStr = scanner.nextLine().trim();
        }
        if (receiverIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int receiverId;
        try {
            receiverId = Integer.parseInt(receiverIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID invalido");
            return;
        }

        System.out.print("Mensaje: ");
        String content;
        synchronized (scannerLock) {
            content = scanner.nextLine();
        }

        if (content.trim().isEmpty()) {
            System.out.println("Error: El mensaje no puede estar vacio");
            return;
        }

        Message message = new Message(currentUser.getId(), currentUser.getUsername(), content);
        message.setReceiverId(receiverId);

        Packet packet = new Packet(Command.SEND_MESSAGE, Protocol.toJson(message));
        sendPacket(packet);
    }

    private void viewChatHistory() {
        System.out.print("\nID del usuario: ");
        String userIdStr;
        synchronized (scannerLock) {
            userIdStr = scanner.nextLine().trim();
        }
        if (userIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int userId;
        try {
            userId = Integer.parseInt(userIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID invalido");
            return;
        }

        Packet packet = new Packet(Command.GET_HISTORY, String.valueOf(userId));
        sendPacket(packet);
    }

    private void createGroup() {
        System.out.print("\nNombre del grupo: ");
        String groupName;
        synchronized (scannerLock) {
            groupName = scanner.nextLine().trim();
        }

        if (groupName.isEmpty()) {
            System.out.println("Error: El nombre del grupo no puede estar vacio");
            return;
        }

        Packet packet = new Packet(Command.CREATE_GROUP, groupName);
        sendPacket(packet);
    }

    private void sendGroupMessage() {
        System.out.print("\nID del grupo: ");
        String groupIdStr;
        synchronized (scannerLock) {
            groupIdStr = scanner.nextLine().trim();
        }
        if (groupIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int groupId;
        try {
            groupId = Integer.parseInt(groupIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID invalido");
            return;
        }

        System.out.print("Mensaje: ");
        String content;
        synchronized (scannerLock) {
            content = scanner.nextLine();
        }

        if (content.trim().isEmpty()) {
            System.out.println("Error: El mensaje no puede estar vacio");
            return;
        }

        Message message = new Message(currentUser.getId(), currentUser.getUsername(), content);
        message.setGroupId(groupId);

        Packet packet = new Packet(Command.SEND_GROUP_MESSAGE, Protocol.toJson(message));
        sendPacket(packet);
    }

    private void viewGroupMessages() {
        System.out.print("\nID del grupo: ");
        String groupIdStr;
        synchronized (scannerLock) {
            groupIdStr = scanner.nextLine().trim();
        }
        if (groupIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int groupId;
        try {
            groupId = Integer.parseInt(groupIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID invalido");
            return;
        }

        Packet packet = new Packet(Command.GET_GROUP_MESSAGES, String.valueOf(groupId));
        sendPacket(packet);
    }

    private void makeCall() {
        System.out.println("\n1. Llamar a un usuario");
        System.out.println("2. Llamar a un grupo");
        System.out.print("Seleccione una opcion: ");

        String option;
        synchronized (scannerLock) {
            option = scanner.nextLine();
        }

        if (option.equals("1")) {
            makeUserCall();
        } else if (option.equals("2")) {
            makeGroupCall();
        } else {
            System.out.println("Opción invalida");
        }
    }

    private void makeUserCall() {
        System.out.print("\nID del usuario a llamar: ");
        String receiverIdStr;
        synchronized (scannerLock) {
            receiverIdStr = scanner.nextLine().trim();
        }
        if (receiverIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int receiverId;
        try {
            receiverId = Integer.parseInt(receiverIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID invalido");
            return;
        }

        System.out.print("Nombre del usuario: ");
        String receiverUsername;
        synchronized (scannerLock) {
            receiverUsername = scanner.nextLine().trim();
        }

        if (receiverUsername.isEmpty()) {
            System.out.println("Error: El nombre no puede estar vacio");
            return;
        }

        Call call = new Call(currentUser.getId(), currentUser.getUsername(),
                receiverId, receiverUsername);

        Packet packet = new Packet(Command.CALL_REQUEST, Protocol.toJson(call));
        sendPacket(packet);

        System.out.println("\nLlamando a " + receiverUsername + "... (usando TCP para señalizacion)");
    }

    private void makeGroupCall() {
        System.out.print("\nID del grupo a llamar: ");
        String groupIdStr;
        synchronized (scannerLock) {
            groupIdStr = scanner.nextLine().trim();
        }
        if (groupIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int groupId;
        try {
            groupId = Integer.parseInt(groupIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID de grupo invalido");
            return;
        }

        System.out.print("Nombre del grupo: ");
        String groupName;
        synchronized (scannerLock) {
            groupName = scanner.nextLine().trim();
        }

        if (groupName.isEmpty()) {
            System.out.println("Error: El nombre no puede estar vacio");
            return;
        }

        Call call = new Call(currentUser.getId(), currentUser.getUsername(),
                groupId, groupName);
        call.setGroupCall(true);

        Packet packet = new Packet(Command.CALL_REQUEST, Protocol.toJson(call));
        sendPacket(packet);

        System.out.println("\nLlamando al grupo " + groupName + "... (usando TCP para señalizacion)");
    }

    private void sendVoiceNote() {
        System.out.println("\n1. Enviar nota de voz a usuario");
        System.out.println("2. Enviar nota de voz a grupo");
        System.out.print("Seleccione una opcion: ");

        String option;
        synchronized (scannerLock) {
            option = scanner.nextLine();
        }

        if (option.equals("1")) {
            sendVoiceNoteToUser();
        } else if (option.equals("2")) {
            sendVoiceNoteToGroup();
        } else {
            System.out.println("Opción invalida");
        }
    }

    private void sendVoiceNoteToUser() {
        System.out.print("\nID del destinatario: ");
        String receiverIdStr;
        synchronized (scannerLock) {
            receiverIdStr = scanner.nextLine().trim();
        }
        if (receiverIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int receiverId;
        try {
            receiverId = Integer.parseInt(receiverIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID invalido");
            return;
        }

        System.out.print("Duracion del audio (segundos): ");
        String durationStr;
        synchronized (scannerLock) {
            durationStr = scanner.nextLine().trim();
        }

        int duration = 5;
        if (!durationStr.isEmpty()) {
            try {
                duration = Integer.parseInt(durationStr);
                if (duration <= 0) {
                    System.out.println("Duracion invalida, usando 5 segundos por defecto");
                    duration = 5;
                }
            } catch (NumberFormatException e) {
                System.out.println("Duración invalida, usando 5 segundos por defecto");
            }
        } else {
            System.out.println("Usando duración por defecto: 5 segundos");
        }

        Message message = new Message(currentUser.getId(), currentUser.getUsername(),
                "Nota de voz (" + duration + " segundos)");
        message.setReceiverId(receiverId);
        message.setType(Message.MessageType.AUDIO);

        Packet packet = new Packet(Command.SEND_MESSAGE, Protocol.toJson(message));
        sendPacket(packet);

        sendVoiceNoteTCP(receiverId, null, duration);
    }

    private void sendVoiceNoteToGroup() {
        System.out.print("\nID del grupo: ");
        String groupIdStr;
        synchronized (scannerLock) {
            groupIdStr = scanner.nextLine().trim();
        }
        if (groupIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int groupId;
        try {
            groupId = Integer.parseInt(groupIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID invalido");
            return;
        }

        System.out.print("Duracion del audio (segundos): ");
        String durationStr;
        synchronized (scannerLock) {
            durationStr = scanner.nextLine().trim();
        }

        int duration = 5;
        if (!durationStr.isEmpty()) {
            try {
                duration = Integer.parseInt(durationStr);
                if (duration <= 0) {
                    System.out.println("Duración invalida, usando 5 segundos por defecto");
                    duration = 5;
                }
            } catch (NumberFormatException e) {
                System.out.println("Duración invalida, usando 5 segundos por defecto");
            }
        } else {
            System.out.println("Usando duración por defecto: 5 segundos");
        }

        Message message = new Message(currentUser.getId(), currentUser.getUsername(),
                "Nota de voz (" + duration + " segundos)");
        message.setGroupId(groupId);
        message.setType(Message.MessageType.AUDIO);

        Packet packet = new Packet(Command.SEND_GROUP_MESSAGE, Protocol.toJson(message));
        sendPacket(packet);

        sendVoiceNoteTCP(0, groupId, duration);
    }

    // En ChatClient.java, reemplazar el método sendVoiceNoteTCP:

    private void sendVoiceNoteTCP(int receiverId, Integer groupId, int durationSeconds) {
        try {
            System.out.println("\nGrabando audio por " + durationSeconds + " segundos...");

            chat.audio.AudioCapture capture = new chat.audio.AudioCapture();
            byte[] audioData = capture.recordForDuration(durationSeconds * 1000); // Convertir a milisegundos

            if (audioData == null || audioData.length == 0) {
                System.out.println("Error: No se capturó audio");
                return;
            }

            System.out.println("Audio capturado: " + audioData.length + " bytes");
            System.out.println("Enviando audio por TCP...");

            VoiceNoteData voiceNote;
            if (groupId != null) {
                voiceNote = new VoiceNoteData(currentUser.getId(), groupId, audioData, durationSeconds, true);
            } else {
                voiceNote = new VoiceNoteData(currentUser.getId(), receiverId, audioData, durationSeconds);
            }

            Packet packet = new Packet(Command.VOICE_NOTE_DATA, Protocol.toJson(voiceNote));
            sendPacket(packet);

            System.out.println("Nota de voz enviada correctamente por TCP");

        } catch (Exception e) {
            System.err.println("Error enviando nota de voz: " + e.getMessage());
            e.printStackTrace();
        }
    }

// Reemplazar el método handleIncomingVoiceNote:

    private void handleIncomingVoiceNote(Packet packet) {
        try {
            VoiceNoteData voiceNote = Protocol.fromJson(packet.getData(), VoiceNoteData.class);
            byte[] audioData = voiceNote.getAudioBytes();

            if (audioData == null || audioData.length == 0) {
                System.out.println("\nError: Nota de voz vacía");
                return;
            }

            System.out.println("\nRecibida nota de voz (" + voiceNote.getDurationSeconds() +
                    " segundos, " + audioData.length + " bytes)");
            System.out.println("Reproduciendo audio...");

            chat.audio.AudioPlayback playback = new chat.audio.AudioPlayback();
            playback.playChunk(audioData);
            playback.stopPlayback();

            System.out.println("Reproduccion completada");

        } catch (Exception e) {
            System.err.println("Error reproduciendo nota de voz: " + e.getMessage());
            e.printStackTrace();
        }
    }
    private void viewUsers() {
        Packet packet = new Packet(Command.GET_USERS);
        sendPacket(packet);
    }

    private void logout() {
        Packet packet = new Packet(Command.LOGOUT);
        sendPacket(packet);
        running = false;
        System.out.println("\nSesion cerrada");
    }

    private void receiveMessages() {
        try {
            String line;
            while (running && (line = in.readLine()) != null) {
                Packet packet = Protocol.deserialize(line);
                handleResponse(packet);
            }
        } catch (IOException e) {
            if (running) {
                System.err.println("\nConexion perdida con el servidor.");
            }
        } finally {
            running = false; // Ensure running is false if connection is lost
        }
    }

    private void handleResponse(Packet packet) {
        switch (packet.getCommand()) {
            case SUCCESS:
                handleSuccess(packet);
                break;
            case ERROR:
                System.out.println("\nError: " + packet.getError());
                break;
            case RECEIVE_MESSAGE:
                handleIncomingMessage(packet);
                break;
            case VOICE_NOTE_DATA:
                handleIncomingVoiceNote(packet);
                break;
            case CALL_REQUEST:
                handleIncomingCall(packet);
                break;
            case CALL_ACCEPT:
                handleCallAccepted(packet);
                break;
            case CALL_REJECT:
                handleCallRejected(packet);
                break;
            case CALL_END:
                handleCallEnded(packet);
                break;
            case NOTIFICATION:
                System.out.println("\n" + packet.getData());
                break;
        }
    }

    private void handleSuccess(Packet packet) {
        if (currentUser == null && packet.getData() != null) {
            // Respuesta de login/register
            currentUser = Protocol.fromJson(packet.getData(), User.class);
            System.out.println("\nAutenticacion exitosa");
        } else if (packet.getData() != null && packet.getData().startsWith("[")) {
            // Lista de mensajes, usuarios o grupos
            if (packet.getData().contains("\"username\"")) {
                List<User> users = Protocol.fromJson(packet.getData(),
                        new TypeToken<List<User>>(){}.getType());
                displayUsers(users);
            } else if (packet.getData().contains("\"memberIds\"")) {
                List<Group> groups = Protocol.fromJson(packet.getData(),
                        new TypeToken<List<Group>>(){}.getType());
                displayGroups(groups);
            } else {
                List<Message> messages = Protocol.fromJson(packet.getData(),
                        new TypeToken<List<Message>>(){}.getType());
                displayMessages(messages);
            }
        } else {
            System.out.println("\n" + packet.getData());
        }
    }

    private void handleIncomingMessage(Packet packet) {
        Message message = Protocol.fromJson(packet.getData(), Message.class);
        System.out.println("\nNuevo mensaje de " + message.getSenderUsername() + ": " + message.getContent());
    }

    private void handleIncomingCall(Packet packet) {
        Call call = Protocol.fromJson(packet.getData(), Call.class);

        pendingIncomingCall = call; // Mover la interacción al menú

        System.out.println("\n\n========================================");
        System.out.println("LLAMADA ENTRANTE de " + call.getCallerUsername());
        System.out.println("========================================");
        System.out.println("¿Aceptar la llamada? (S / N)");
        System.out.print("> "); // UI clara sin bloqueo
    }

    private void handleCallAccepted(Packet packet) {
        Call call = Protocol.fromJson(packet.getData(), Call.class);

        System.out.println("\n========================================");
        System.out.println("  Llamada aceptada");
        System.out.println("========================================");
        System.out.println("Conectando audio por UDP...");

        if (voiceClient != null) {
            currentCall = call;
            inCall.set(true);

            voiceClient.startCall(call.getReceiverId());

            System.out.println("Llamada en curso");
            System.out.println("Presione Enter para finalizar la llamada");

            new Thread(() -> {
                try {
                    synchronized (scannerLock) {
                        scanner.nextLine();
                    }
                    // Usuario presionó ENTER
                    if (inCall.get()) {
                        endCurrentCall();
                    }
                } catch (Exception e) {
                    // Ignorar interrupciones
                }
            }).start();
        } else {
            System.err.println("Error: VoiceClient no inicializado");
        }
    }

    private void handleCallRejected(Packet packet) {
        System.out.println("\nLlamada rechazada");
    }

    private void handleCallEnded(Packet packet) {
        if (inCall.get()) {
            inCall.set(false);

            if (voiceClient != null && voiceClient.isInCall()) {
                voiceClient.endCall();
            }

            currentCall = null;
            System.out.println("\nLlamada finalizada por el otro usuario");
        }
    }

    private void displayMessages(List<Message> messages) {
        System.out.println("\n============ HISTORIAL ============");
        if (messages.isEmpty()) {
            System.out.println("No hay mensajes");
        } else {
            for (Message msg : messages) {
                System.out.println(msg);
            }
        }
        System.out.println("===================================");
    }

    private void displayUsers(List<User> users) {
        System.out.println("\n============ USUARIOS ============");
        if (users == null || users.isEmpty()) {
            System.out.println("No hay usuarios registrados.");
        } else {
            for (User user : users) {
                if (currentUser != null && user.getId() != currentUser.getId()) {
                    System.out.println("ID: " + user.getId() + " - " + user);
                } else if (currentUser == null) { // Handle case where currentUser might not be set yet
                    System.out.println("ID: " + user.getId() + " - " + user);
                }
            }
        }
        System.out.println("==================================");
    }

    private void viewMyGroups() {
        if (currentUser == null) {
            System.out.println("Usuario no autenticado.");
            return;
        }
        Packet packet = new Packet(Command.GET_USER_GROUPS, String.valueOf(currentUser.getId()));
        sendPacket(packet);
    }

    private void addMemberToGroup() {
        System.out.print("\nID del grupo: ");
        String groupIdStr;
        synchronized (scannerLock) {
            groupIdStr = scanner.nextLine().trim();
        }
        if (groupIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int groupId;
        try {
            groupId = Integer.parseInt(groupIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID de grupo invalido");
            return;
        }

        System.out.print("ID del usuario a agregar: ");
        String userIdStr;
        synchronized (scannerLock) {
            userIdStr = scanner.nextLine().trim();
        }
        if (userIdStr.isEmpty()) {
            System.out.println("Error: Debe ingresar un ID valido");
            return;
        }

        int userId;
        try {
            userId = Integer.parseInt(userIdStr);
        } catch (NumberFormatException e) {
            System.out.println("Error: ID de usuario invalido");
            return;
        }

        Packet packet = new Packet(Command.ADD_TO_GROUP, groupId + "," + userId);
        sendPacket(packet);
    }

    private void displayGroups(List<Group> groups) {
        System.out.println("\n============ MIS GRUPOS ============");
        if (groups == null || groups.isEmpty()) {
            System.out.println("No perteneces a ningun grupo");
        } else {
            for (Group group : groups) {
                System.out.println("ID: " + group.getId() + " - " + group);
            }
        }
        System.out.println("====================================");
    }

    private void sendPacket(Packet packet) {
        if (out != null && !socket.isClosed()) {
            out.println(Protocol.serialize(packet));
        } else {
            System.err.println("Error: No se puede enviar paquete. Conexion cerrada o no inicializada.");
        }
    }

    private void disconnect() {
        try {
            running = false; // Signal the receiveMessages loop to stop
            if (voiceClient != null) {
                voiceClient.close();
                voiceClient = null; // Help garbage collection
            }
            if (socket != null && !socket.isClosed()) {
                socket.close();
            }
            synchronized (scannerLock) {
                if (scanner != null) {
                    scanner.close();
                    scanner = null; // Help garbage collection
                }
            }
            // Close output stream as well
            if (out != null) {
                out.close();
            }
            // Close input stream as well
            if (in != null) {
                in.close();
            }
        } catch (IOException e) {
            System.err.println("Error al desconectar: " + e.getMessage());
        }
    }


    public static void main(String[] args) {
        ChatClient client = new ChatClient();
        client.start();
    }
}

package chat.server;

import chat.config.ServerConfig;
import chat.config.DatabaseConfig;
import chat.controller.ChatController;
import chat.handler.ClientHandler;
import chat.handler.ClientRegistry;
import chat.repository.*;
import chat.repository.impl.*;
import chat.service.*;
import chat.service.impl.*;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TcpChatServer {
    private final ServerConfig config;
    private final ExecutorService threadPool;
    private final ChatController controller;
    private final ClientRegistry clientRegistry;
    private final DatabaseConfig dbConfig;
    
    public TcpChatServer() {
        this.config = ServerConfig.getInstance();
        this.threadPool = Executors.newFixedThreadPool(config.getThreadPoolSize());
        
        this.dbConfig = DatabaseConfig.getInstance();
        
        UserRepository userRepository = new PostgresUserRepository();
        MessageRepository messageRepository = new PostgresMessageRepository();
        GroupRepository groupRepository = new PostgresGroupRepository();
        CallRepository callRepository = new PostgresCallRepository();
        
        // Inicializar servicios
        UserService userService = new UserServiceImpl(userRepository);
        MessageService messageService = new MessageServiceImpl(messageRepository);
        GroupService groupService = new GroupServiceImpl(groupRepository);
        CallService callService = new CallServiceImpl(callRepository);
        
        // Inicializar controlador
        this.controller = new ChatController(userService, messageService, groupService, callService);
        
        // Inicializar registro de clientes
        this.clientRegistry = new ClientRegistry(groupRepository);
    }
    
    public void start() {
        System.out.println("========================================");
        System.out.println("     SERVIDOR DE CHAT - WhatsApp CLI    ");
        System.out.println("========================================");
        System.out.println();
        
        try {
            int port = config.getTcpPort();
            ServerSocket serverSocket = new ServerSocket(port);
            System.out.println("Servidor TCP iniciado en puerto " + port);
            System.out.println("Almacenamiento PostgreSQL inicializado");
            System.out.println("Thread pool configurado con " + config.getThreadPoolSize() + " threads");
            System.out.println("Esperando conexiones...\n");
            
            while (true) {
                Socket clientSocket = serverSocket.accept();
                ClientHandler handler = new ClientHandler(clientSocket, controller, clientRegistry);
                threadPool.execute(handler);
            }
        } catch (IOException e) {
            System.err.println("Error en el servidor: " + e.getMessage());
        } finally {
            threadPool.shutdown();
            dbConfig.close();
        }
    }
    
    public static void main(String[] args) {
        TcpChatServer server = new TcpChatServer();
        server.start();
    }
}

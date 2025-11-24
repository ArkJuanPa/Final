package chat.config;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public class ServerConfig {
    private static ServerConfig instance;
    private Properties properties;
    
    private static final int DEFAULT_TCP_PORT = 5000;
    private static final int DEFAULT_UDP_PORT = 5001;
    private static final int DEFAULT_THREAD_POOL_SIZE = 10;
    private static final String DEFAULT_HOST = "localhost";
    
    private ServerConfig() {
        properties = new Properties();
        loadDefaultProperties();
    }
    
    public static synchronized ServerConfig getInstance() {
        if (instance == null) {
            instance = new ServerConfig();
        }
        return instance;
    }
    
    private void loadDefaultProperties() {
        properties.setProperty("server.tcp.port", String.valueOf(DEFAULT_TCP_PORT));
        properties.setProperty("server.udp.port", String.valueOf(DEFAULT_UDP_PORT));
        properties.setProperty("server.host", DEFAULT_HOST);
        properties.setProperty("server.threadpool.size", String.valueOf(DEFAULT_THREAD_POOL_SIZE));
    }
    
    public int getTcpPort() {
        return Integer.parseInt(properties.getProperty("server.tcp.port"));
    }
    
    public int getUdpPort() {
        return Integer.parseInt(properties.getProperty("server.udp.port"));
    }
    
    public String getHost() {
        return properties.getProperty("server.host");
    }
    
    public int getThreadPoolSize() {
        return Integer.parseInt(properties.getProperty("server.threadpool.size"));
    }
}

package chat.model;

import java.io.Serializable;
import java.time.LocalDateTime;

public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private int id;
    private String username;
    private String status;
    private LocalDateTime lastSeen;
    private boolean online;

    public User(String username) {
        this.username = username;
        this.status = "Disponible";
        this.online = false;
    }
    
    public User(int id, String username) {
        this.id = id;
        this.username = username;
        this.status = "Disponible";
        this.online = false;
    }
    
    public int getId() {
        return id;
    }
    
    public void setId(int id) {
        this.id = id;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public LocalDateTime getLastSeen() {
        return lastSeen;
    }
    
    public void setLastSeen(LocalDateTime lastSeen) {
        this.lastSeen = lastSeen;
    }
    
    public boolean isOnline() {
        return online;
    }
    
    public void setOnline(boolean online) {
        this.online = online;
    }
    
    @Override
    public String toString() {
        return username + (online ? " (En línea)" : " (Desconectado)");
    }
}

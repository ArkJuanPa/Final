package chat.model;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Group implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private int id;
    private String name;
    private String description;
    private int adminId;
    private LocalDateTime createdAt;
    private List<Integer> memberIds;
    
    public Group() {
        this.createdAt = LocalDateTime.now();
        this.memberIds = new ArrayList<>();
    }
    
    public Group(int id, String name, int adminId) {
        this();
        this.id = id;
        this.name = name;
        this.adminId = adminId;
        this.memberIds.add(adminId);
    }

    //Añadido
    public Group(String name, int adminId) {
        this();
        this.name = name;
        this.adminId = adminId;
        this.memberIds.add(adminId);
    }


    public int getId() {
        return id;
    }
    
    public void setId(int id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }

    public int getCreatorId() {
        return adminId;
    }
    
    public void setAdminId(int adminId) {
        this.adminId = adminId;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public List<Integer> getMemberIds() {
        return memberIds;
    }
    
    public void setMemberIds(List<Integer> memberIds) {
        this.memberIds = memberIds;
    }
    
    public void addMember(int userId) {
        if (!memberIds.contains(userId)) {
            memberIds.add(userId);
        }
    }
    
    public void removeMember(int userId) {
        memberIds.remove(Integer.valueOf(userId));
    }
    
    @Override
    public String toString() {
        return String.format("%s (%d miembros)", name, memberIds.size());
    }
}

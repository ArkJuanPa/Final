package chat.repository.impl;

import chat.config.DatabaseConfig;
import chat.model.Group;
import chat.repository.GroupRepository;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class PostgresGroupRepository implements GroupRepository {
    private final DatabaseConfig dbConfig;
    
    public PostgresGroupRepository() {
        this.dbConfig = DatabaseConfig.getInstance();
    }
    
    @Override
    public Group save(Group group) {
        String sql = "INSERT INTO groups (name, creator_id) VALUES (?, ?) RETURNING id";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, group.getName());
            stmt.setInt(2, group.getCreatorId());
            
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                group.setId(rs.getInt("id"));
            }
            
        
            addMember(group.getId(), group.getCreatorId());
            
            return group;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error saving group", e);
        }
    }
    
    @Override
    public Optional<Group> findById(int id) {
        String sql = "SELECT * FROM groups WHERE id = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                Group group = mapResultSetToGroup(rs);
                loadGroupMembers(group);
                return Optional.of(group);
            }
            
            return Optional.empty();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding group by id", e);
        }
    }
    
    @Override
    public List<Group> findByUserId(int userId) {
        String sql = "SELECT g.* FROM groups g " +
                     "INNER JOIN group_members gm ON g.id = gm.group_id " +
                     "WHERE gm.user_id = ? " +
                     "ORDER BY g.created_at DESC";
        List<Group> groups = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, userId);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                Group group = mapResultSetToGroup(rs);
                loadGroupMembers(group);
                groups.add(group);
            }
            
            return groups;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding groups by user", e);
        }
    }
    
    @Override
    public void addMember(int groupId, int userId) {
        String sql = "INSERT INTO group_members (group_id, user_id) VALUES (?, ?) " +
                     "ON CONFLICT (group_id, user_id) DO NOTHING";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, groupId);
            stmt.setInt(2, userId);
            stmt.executeUpdate();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error adding member to group", e);
        }
    }
    
    private Group mapResultSetToGroup(ResultSet rs) throws SQLException {
        Group group = new Group(rs.getString("name"), rs.getInt("creator_id"));
        group.setId(rs.getInt("id"));
        return group;
    }
    
    private void loadGroupMembers(Group group) {
        String sql = "SELECT user_id FROM group_members WHERE group_id = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, group.getId());
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                group.addMember(rs.getInt("user_id"));
            }
            
        } catch (SQLException e) {
            throw new RuntimeException("Error loading group members", e);
        }
    }
}

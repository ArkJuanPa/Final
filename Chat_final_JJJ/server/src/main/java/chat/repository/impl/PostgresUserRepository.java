package chat.repository.impl;

import chat.config.DatabaseConfig;
import chat.model.User;
import chat.repository.UserRepository;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class PostgresUserRepository implements UserRepository {
    private final DatabaseConfig dbConfig;
    
    public PostgresUserRepository() {
        this.dbConfig = DatabaseConfig.getInstance();
    }
    
    @Override
    public User save(User user) {
        String sql = "INSERT INTO users (username, online) VALUES (?, ?) RETURNING id";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, user.getUsername());
            stmt.setBoolean(2, user.isOnline());
            
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                user.setId(rs.getInt("id"));
            }
            
            return user;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error saving user", e);
        }
    }
    
    @Override
    public Optional<User> findById(int id) {
        String sql = "SELECT * FROM users WHERE id = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return Optional.of(mapResultSetToUser(rs));
            }
            
            return Optional.empty();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding user by id", e);
        }
    }
    
    @Override
    public Optional<User> findByUsername(String username) {
        String sql = "SELECT * FROM users WHERE username = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, username);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return Optional.of(mapResultSetToUser(rs));
            }
            
            return Optional.empty();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding user by username", e);
        }
    }
    
    @Override
    public List<User> findAll() {
        String sql = "SELECT * FROM users ORDER BY username";
        List<User> users = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                users.add(mapResultSetToUser(rs));
            }
            
            return users;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding all users", e);
        }
    }
    
    @Override
    public boolean existsByUsername(String username) {
        String sql = "SELECT COUNT(*) FROM users WHERE username = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, username);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return rs.getInt(1) > 0;
            }
            
            return false;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error checking if user exists", e);
        }
    }
    
    @Override
    public void updateOnlineStatus(int userId, boolean online) {
        String sql = "UPDATE users SET online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setBoolean(1, online);
            stmt.setInt(2, userId);
            stmt.executeUpdate();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error updating online status", e);
        }
    }
    
    private User mapResultSetToUser(ResultSet rs) throws SQLException {
        User user = new User(rs.getString("username"));
        user.setId(rs.getInt("id"));
        user.setOnline(rs.getBoolean("online"));
        return user;
    }
}

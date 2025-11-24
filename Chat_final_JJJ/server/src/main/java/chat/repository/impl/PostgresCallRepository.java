package chat.repository.impl;

import chat.config.DatabaseConfig;
import chat.model.Call;
import chat.repository.CallRepository;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class PostgresCallRepository implements CallRepository {
    private final DatabaseConfig dbConfig;
    
    public PostgresCallRepository() {
        this.dbConfig = DatabaseConfig.getInstance();
    }
    
    @Override
    public Call save(Call call) {
        String sql = "INSERT INTO calls (caller_id, caller_username, receiver_id, receiver_username, " +
                "group_id, is_group_call, status, started_at, ended_at, duration_seconds) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

        
            stmt.setInt(1, call.getCallerId());
            stmt.setString(2, call.getCallerUsername());


            if (call.isGroupCall()) {
                stmt.setNull(3, Types.INTEGER);
                stmt.setNull(4, Types.VARCHAR);
                stmt.setInt(5, call.getReceiverId()); 
            } else {
                stmt.setInt(3, call.getReceiverId());
                stmt.setString(4, call.getReceiverUsername());
                stmt.setNull(5, Types.INTEGER); 
            }


            stmt.setBoolean(6, call.isGroupCall());
            stmt.setString(7, call.getStatus().name());


            if (call.getStartTime() != null) {
                stmt.setTimestamp(8, Timestamp.valueOf(call.getStartTime()));

            } else {
                stmt.setNull(8, Types.TIMESTAMP);

            }

            if (call.getEndTime() != null) {
                stmt.setTimestamp(9, Timestamp.valueOf(call.getEndTime()));
                stmt.setInt(10, call.getDurationSeconds());
            } else {
                stmt.setNull(9, Types.TIMESTAMP);
                stmt.setNull(10, Types.TIMESTAMP);
            }

     
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                call.setCallId(rs.getInt("id"));
            }

            return call;

        } catch (SQLException e) {
            throw new RuntimeException("Error saving call", e);
        }
    }
    
    @Override
    public Optional<Call> findById(int id) {
        String sql = "SELECT * FROM calls WHERE id = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                return Optional.of(mapResultSetToCall(rs));
            }
            
            return Optional.empty();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding call by id", e);
        }
    }
    
    @Override
    public List<Call> findByUserId(int userId) {
        String sql = "SELECT * FROM calls WHERE caller_id = ? OR receiver_id = ? " +
                     "ORDER BY started_at DESC";
        List<Call> calls = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, userId);
            stmt.setInt(2, userId);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                calls.add(mapResultSetToCall(rs));
            }
            
            return calls;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding calls by user", e);
        }
    }
    
    @Override
    public List<Call> findByGroupId(int groupId) {
        String sql = "SELECT * FROM calls WHERE group_id = ? ORDER BY started_at DESC";
        List<Call> calls = new ArrayList<>();
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, groupId);
            ResultSet rs = stmt.executeQuery();
            
            while (rs.next()) {
                calls.add(mapResultSetToCall(rs));
            }
            
            return calls;
            
        } catch (SQLException e) {
            throw new RuntimeException("Error finding calls by group", e);
        }
    }
    
    @Override
    public void updateCallStatus(int callId, String status) {
        String sql = "UPDATE calls SET status = ? WHERE id = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, status);
            stmt.setInt(2, callId);
            stmt.executeUpdate();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error updating call status", e);
        }
    }
    
    @Override
    public void endCall(int callId, int durationSeconds) {
        String sql = "UPDATE calls SET ended_at = CURRENT_TIMESTAMP, duration_seconds = ?, " +
                     "status = 'ENDED' WHERE id = ?";
        
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, durationSeconds);
            stmt.setInt(2, callId);
            stmt.executeUpdate();
            
        } catch (SQLException e) {
            throw new RuntimeException("Error ending call", e);
        }
    }
    
    private Call mapResultSetToCall(ResultSet rs) throws SQLException {
        boolean isGroupCall = rs.getBoolean("is_group_call");
        
        Call call;
        if (isGroupCall) {
            call = new Call(
                rs.getInt("caller_id"),
                rs.getString("caller_username"),
                rs.getInt("group_id"),
                "" 
            );
            call.setGroupCall(true);
        } else {
            call = new Call(
                rs.getInt("caller_id"),
                rs.getString("caller_username"),
                rs.getInt("receiver_id"),
                rs.getString("receiver_username")
            );
        }
        
        call.setCallId(rs.getInt("id"));
        call.setStatus(Call.CallStatus.valueOf(rs.getString("status")));
        
        return call;
    }
}

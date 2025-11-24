package chat.repository;

import chat.model.User;
import java.util.List;
import java.util.Optional;

public interface UserRepository {
    User save(User user);
    Optional<User> findById(int id);
    Optional<User> findByUsername(String username);
    List<User> findAll();
    boolean existsByUsername(String username);
    void updateOnlineStatus(int userId, boolean online);
}

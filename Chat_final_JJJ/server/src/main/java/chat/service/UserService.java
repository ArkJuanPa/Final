package chat.service;

import chat.model.User;
import java.util.List;

public interface UserService {
    User register(String username) throws Exception;
    User login(String username) throws Exception;
    void logout(int userId);
    List<User> getAllUsers();
    User getUserById(int userId) throws Exception;
}

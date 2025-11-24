package chat.service.impl;

import chat.model.User;
import chat.repository.UserRepository;
import chat.service.UserService;

import java.util.List;

public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    
    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    public User register(String username) throws Exception {
        if (username == null || username.trim().isEmpty()) {
            throw new Exception("El nombre de usuario no puede estar vacio");
        }
        
        if (userRepository.existsByUsername(username)) {
            throw new Exception("El usuario ya existe");
        }
        
        User user = new User(0, username);
        user.setOnline(true);
        return userRepository.save(user);
    }
    
    @Override
    public User login(String username) throws Exception {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new Exception("Usuario no encontrado"));
        
        userRepository.updateOnlineStatus(user.getId(), true);
        return user;
    }
    
    @Override
    public void logout(int userId) {
        userRepository.updateOnlineStatus(userId, false);
    }
    
    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    @Override
    public User getUserById(int userId) throws Exception {
        return userRepository.findById(userId)
            .orElseThrow(() -> new Exception("Usuario no encontrado"));
    }
}

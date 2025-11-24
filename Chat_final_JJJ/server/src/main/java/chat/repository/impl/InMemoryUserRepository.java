package chat.repository.impl;

import chat.model.User;
import chat.repository.UserRepository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class InMemoryUserRepository implements UserRepository {
    private final Map<Integer, User> usersById = new ConcurrentHashMap<>();
    private final Map<String, User> usersByUsername = new ConcurrentHashMap<>();
    private final AtomicInteger idCounter = new AtomicInteger(1);
    
    @Override
    public User save(User user) {
        if (user.getId() == 0) {
            user.setId(idCounter.getAndIncrement());
        }
        usersById.put(user.getId(), user);
        usersByUsername.put(user.getUsername(), user);
        return user;
    }
    
    @Override
    public Optional<User> findById(int id) {
        return Optional.ofNullable(usersById.get(id));
    }
    
    @Override
    public Optional<User> findByUsername(String username) {
        return Optional.ofNullable(usersByUsername.get(username));
    }
    
    @Override
    public List<User> findAll() {
        return new ArrayList<>(usersById.values());
    }
    
    @Override
    public boolean existsByUsername(String username) {
        return usersByUsername.containsKey(username);
    }
    
    @Override
    public void updateOnlineStatus(int userId, boolean online) {
        findById(userId).ifPresent(user -> user.setOnline(online));
    }
}

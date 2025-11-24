package chat.repository.impl;

import chat.model.Group;
import chat.repository.GroupRepository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

public class InMemoryGroupRepository implements GroupRepository {
    private final Map<Integer, Group> groups = new ConcurrentHashMap<>();
    private final AtomicInteger idCounter = new AtomicInteger(1);
    
    @Override
    public Group save(Group group) {
        if (group.getId() == 0) {
            group.setId(idCounter.getAndIncrement());
        }
        groups.put(group.getId(), group);
        return group;
    }
    
    @Override
    public Optional<Group> findById(int id) {
        return Optional.ofNullable(groups.get(id));
    }
    
    @Override
    public List<Group> findByUserId(int userId) {
        return groups.values().stream()
            .filter(group -> group.getMemberIds().contains(userId))
            .collect(Collectors.toList());
    }
    
    @Override
    public void addMember(int groupId, int userId) {
        findById(groupId).ifPresent(group -> {
            if (!group.getMemberIds().contains(userId)) {
                group.getMemberIds().add(userId);
            }
        });
    }
}

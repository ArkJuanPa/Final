package chat.service.impl;

import chat.model.Group;
import chat.repository.GroupRepository;
import chat.service.GroupService;

import java.util.List;

public class GroupServiceImpl implements GroupService {
    private final GroupRepository groupRepository;
    
    public GroupServiceImpl(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }
    
    @Override
    public Group createGroup(String name, int creatorId) {
        Group group = new Group(0, name, creatorId);
        group.getMemberIds().add(creatorId);
        return groupRepository.save(group);
    }
    
    @Override
    public List<Group> getUserGroups(int userId) {
        return groupRepository.findByUserId(userId);
    }
    
    @Override
    public void addMemberToGroup(int groupId, int userId) throws Exception {
        Group group = groupRepository.findById(groupId)
            .orElseThrow(() -> new Exception("Grupo no encontrado"));
        
        groupRepository.addMember(groupId, userId);
    }
    
    @Override
    public Group getGroupById(int groupId) throws Exception {
        return groupRepository.findById(groupId)
            .orElseThrow(() -> new Exception("Grupo no encontrado"));
    }
}

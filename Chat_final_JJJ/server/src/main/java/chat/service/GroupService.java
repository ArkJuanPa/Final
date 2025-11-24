package chat.service;

import chat.model.Group;
import java.util.List;

public interface GroupService {
    Group createGroup(String name, int creatorId);
    List<Group> getUserGroups(int userId);
    void addMemberToGroup(int groupId, int userId) throws Exception;
    Group getGroupById(int groupId) throws Exception;
}

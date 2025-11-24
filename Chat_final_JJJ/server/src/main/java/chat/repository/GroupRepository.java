package chat.repository;

import chat.model.Group;
import java.util.List;
import java.util.Optional;

public interface GroupRepository {
    Group save(Group group);
    Optional<Group> findById(int id);
    List<Group> findByUserId(int userId);
    void addMember(int groupId, int userId);
}

package com.example.literature.document;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KnowledgeSpaceRepository extends JpaRepository<KnowledgeSpace, String> {

    @Query(value = "select distinct ks.* from knowledge_space ks "
            + "left join space_member sm on sm.space_id = ks.id and sm.user_id = :userId "
            + "left join group_member gm on gm.group_id = ks.group_id and gm.user_id = :userId "
            + "where ks.owner_user_id = :userId or sm.user_id is not null or gm.user_id is not null "
            + "order by ks.created_at desc", nativeQuery = true)
    List<KnowledgeSpace> findAccessibleByUserId(@Param("userId") String userId);
}

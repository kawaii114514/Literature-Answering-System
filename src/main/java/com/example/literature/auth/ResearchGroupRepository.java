package com.example.literature.auth;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ResearchGroupRepository extends JpaRepository<ResearchGroup, String> {

    @Query(value = "select distinct rg.* from research_group rg "
            + "join group_member gm on gm.group_id = rg.id "
            + "where gm.user_id = :userId order by rg.created_at desc", nativeQuery = true)
    List<ResearchGroup> findAccessibleByUserId(@Param("userId") String userId);
}

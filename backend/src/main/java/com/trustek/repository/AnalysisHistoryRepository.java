package com.trustek.repository;

import com.trustek.entity.AnalysisHistory;
import com.trustek.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for AnalysisHistory entity
 */
@Repository
public interface AnalysisHistoryRepository extends JpaRepository<AnalysisHistory, Long> {
    Page<AnalysisHistory> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
}


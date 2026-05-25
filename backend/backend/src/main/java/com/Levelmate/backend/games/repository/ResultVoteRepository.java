package com.Levelmate.backend.games.repository;

import com.Levelmate.backend.games.entity.ResultVote;
import com.Levelmate.backend.games.entity.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ResultVoteRepository extends JpaRepository<ResultVote, UUID> {

    boolean existsByResultIdAndUserId(UUID resultId, UUID userId);

    long countByResultIdAndVote(UUID resultId, VoteType vote);
}

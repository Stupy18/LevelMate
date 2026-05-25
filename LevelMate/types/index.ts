export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  avatarData?: string
}

export interface Sport {
  id: string
  name: string
  ratingType: 'ELO_COMPETITIVE' | 'GRADE_BASED' | 'PERFORMANCE_BASED'
  description?: string
}

export interface ProfileSport {
  sportId: string
  sportName: string
  ratingType: 'ELO_COMPETITIVE' | 'GRADE_BASED' | 'PERFORMANCE_BASED'
  eloRating?: number
  gamesPlayed: number
  grade?: string
  level?: number
}

export interface ProfileCoachProfile {
  coachProfileId: string
  sportId: string
  sportName: string
  description?: string
  hourlyRateCents?: number
  isVerified: boolean
}

export interface UserProfile {
  userId: string
  displayName: string
  avatarUrl?: string
  avatarData?: string
  sports: ProfileSport[]
  coachProfiles: ProfileCoachProfile[]
}

export interface UserSport {
  sportId: string
  sport: Sport
  selfReportedLevel: number
  elo?: number
  gamesPlayed?: number
  boulderingCurrentGrade?: string
  boulderingProjectGrade?: string
}

export interface GameParticipant {
  participantId: string
  userId: string
  displayName: string
  role: 'HOST' | 'PLAYER'
  team: 'TEAM_A' | 'TEAM_B' | null
  joinedAt: string
}

export interface GameResult {
  id: string
  sessionId: string
  reportedByUserId: string
  confirmedByUserId?: string
  winnerTeam: 'TEAM_A' | 'TEAM_B' | 'DRAW'
  scoreTeamA?: number
  scoreTeamB?: number
  status: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'DISPUTED'
  reportedAt: string
  confirmedAt?: string
}

export interface GameSession {
  id: string
  sportId: string
  sportName: string
  hostUserId: string
  hostDisplayName: string
  title?: string
  description?: string
  status: 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED'
  scheduledAt: string
  durationMinutes?: number
  minPlayers: number
  maxPlayers: number
  minLevel?: number
  maxLevel?: number
  locationAddress?: string
  locationLat?: number
  locationLng?: number
  locationName?: string
  googlePlaceId?: string
  googlePhotoReference?: string
  participantCount: number
  spotsRemaining: number
  participants?: GameParticipant[]
  createdAt?: string
}

export interface PendingResult {
  sessionId: string
  title: string
  sportName: string
  sportSlug: string
  scheduledAt: string
  locationName?: string
  participantCount?: number
  pendingType: 'NOT_REPORTED' | 'REPORTED_BY_OTHER' | 'DISPUTED'
}

export interface ConflictingSession {
  id: string
  title: string
  scheduledAt: string
  durationMinutes: number | null
  sportName: string
  locationName: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface ApiError {
  errorCode: string
  message: string
}

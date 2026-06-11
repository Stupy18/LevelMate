export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  avatarData?: string
  role?: 'USER' | 'ADMIN'
}

export interface Sport {
  id: string
  name: string
  slug: string
  ratingType: 'ELO_COMPETITIVE' | 'GRADE_BASED' | 'PERFORMANCE_BASED'
  description?: string
}

export interface SportMetricDefinition {
  id: string
  metricKey: string
  label: string
  inputType: 'number' | 'duration' | 'grade_v' | 'grade_french_sport' | 'text'
  unit?: string | null
  isRequired: boolean
  displayOrder: number
}

export interface SportMetricValue {
  metricKey: string
  label: string
  inputType: string
  unit?: string | null
  value: string | null
}

export interface ProfileSport {
  sportId: string
  sportName: string
  sportSlug: string
  ratingType: 'ELO_COMPETITIVE' | 'GRADE_BASED' | 'PERFORMANCE_BASED'
  eloRating?: number
  gamesPlayed: number
  grade?: string
  level?: number
  metrics: SportMetricValue[]
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
  isCapt: boolean
  pbUpdateSubmitted: boolean
  sessionAcknowledged: boolean
}

export interface GameResult {
  id: string
  sessionId: string
  reportedByUserId: string
  confirmedByUserId?: string
  winnerTeam: 'TEAM_A' | 'TEAM_B' | 'DRAW'
  scoreTeamA?: number
  scoreTeamB?: number
  counterReportedByUserId?: string
  counterWinnerTeam?: 'TEAM_A' | 'TEAM_B' | 'DRAW'
  counterScoreTeamA?: number
  counterScoreTeamB?: number
  status: 'PENDING_CONFIRMATION' | 'COUNTER_PROPOSED' | 'CONFIRMED' | 'DISPUTED'
  reportedAt: string
  confirmedAt?: string
  disputedAt?: string
}

export interface GameSession {
  id: string
  sportId: string
  sportName: string
  sportSlug?: string
  ratingType?: 'ELO_COMPETITIVE' | 'GRADE_BASED' | 'PERFORMANCE_BASED'
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
  targetPace?: string
  gradeMin?: string
  gradeMax?: string
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
  cancellationReasonInsufficientPlayers?: boolean
}

export interface PendingResult {
  sessionId: string
  title: string
  sportName: string
  sportSlug: string
  scheduledAt: string
  locationName?: string
  participantCount?: number
  pendingType: 'NOT_REPORTED' | 'REPORTED_BY_OTHER' | 'COUNTER_PROPOSED' | 'DISPUTED' | 'PB_UPDATE' | 'SESSION_LOG' | 'CANCELLED_SESSION'
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

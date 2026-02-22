// ═══════════════════════════════════════════════════════════════
// DreamPlanner — Centralized Mock Data
// ═══════════════════════════════════════════════════════════════

export const MOCK_USER = {
  id: "u1",
  displayName: "Stephane",
  email: "stephane@rhematek.com",
  initial: "S",
  level: 12,
  xp: 2450,
  xpToNext: 3000,
  streakDays: 7,
  rank: "Achiever",
  globalRank: 4,
  notificationCount: 3,
  subscription: "PRO",
  renewalDate: "Mar 15, 2026",
  timezone: "America/Toronto",
  bio: "Building dreams into reality, one goal at a time.",
  joinedDate: "Sep 2025",
  skills: [
    { name: "Health & Fitness", level: 8, xp: 780, xpToNext: 1000, color: "#10B981" },
    { name: "Career & Work", level: 11, xp: 420, xpToNext: 1000, color: "#8B5CF6" },
    { name: "Relationships", level: 6, xp: 550, xpToNext: 1000, color: "#14B8A6" },
    { name: "Personal Growth", level: 9, xp: 310, xpToNext: 1000, color: "#6366F1" },
    { name: "Hobbies & Creativity", level: 5, xp: 680, xpToNext: 1000, color: "#EC4899" },
  ],
  achievements: [
    { id: "a1", name: "7-Day Streak", icon: "🔥", color: "#F59E0B" },
    { id: "a2", name: "Level 10", icon: "⭐", color: "#8B5CF6" },
    { id: "a3", name: "Dream Master", icon: "🎯", color: "#10B981" },
    { id: "a4", name: "50 Tasks", icon: "✅", color: "#3B82F6" },
    { id: "a5", name: "Social Butterfly", icon: "🦋", color: "#EC4899" },
  ],
};

export const MOCK_DREAMS = [
  { id: "1", title: "Launch my SaaS Platform", description: "Build and deploy a production-grade multi-tenant HR platform with 10k users", category: "career", progress: 62, goalCount: 8, completedGoalCount: 5, status: "active", daysLeft: 45 },
  { id: "2", title: "Learn Piano in 6 Months", description: "Master 10 worship songs and be able to play in church by summer", category: "hobbies", progress: 35, goalCount: 6, completedGoalCount: 2, status: "active", daysLeft: 120 },
  { id: "3", title: "Run a Half Marathon", description: "Train progressively and complete a 21km race in under 2 hours", category: "health", progress: 42, goalCount: 5, completedGoalCount: 2, status: "active", daysLeft: 90 },
  { id: "4", title: "Save $15,000 Emergency Fund", description: "Build a solid financial safety net within 12 months", category: "finance", progress: 88, goalCount: 4, completedGoalCount: 3, status: "active", daysLeft: 30 },
];

export const MOCK_DREAM_DETAIL = {
  id: "3",
  title: "Run a Half Marathon",
  description: "Train progressively and complete a 21km race in under 2 hours",
  category: "health",
  progress: 42,
  totalTasks: 12,
  completedTasks: 5,
  xpEarned: 580,
  timeframe: "6 months",
  milestones: [
    { id: "m1", title: "Complete first 5K run", date: "Dec 15, 2025", completed: true },
    { id: "m2", title: "Run 10K under 55 minutes", date: "Jan 20, 2026", completed: true },
    { id: "m3", title: "Complete a 15K training run", date: "Feb 28, 2026", completed: false, active: true },
    { id: "m4", title: "Run 18K at race pace", date: "Mar 30, 2026", completed: false },
    { id: "m5", title: "Race Day — 21K", date: "May 1, 2026", completed: false },
  ],
  goals: [
    {
      id: "g1", title: "Build Base Endurance", progress: 100, completed: true,
      tasks: [
        { id: "t1", title: "Run 3x per week for 4 weeks", completed: true, xp: 50 },
        { id: "t2", title: "Complete 5K without stopping", completed: true, xp: 75 },
        { id: "t3", title: "Establish morning run routine", completed: true, xp: 40 },
      ],
    },
    {
      id: "g2", title: "Increase Distance", progress: 45,
      tasks: [
        { id: "t4", title: "Run 8K comfortably", completed: true, xp: 60 },
        { id: "t5", title: "Complete 10K under 55 min", completed: true, xp: 80 },
        { id: "t6", title: "Weekly long run of 12K", completed: false, xp: 70 },
        { id: "t7", title: "Add hill training 1x/week", completed: false, xp: 55 },
      ],
    },
    {
      id: "g3", title: "Race Preparation", progress: 0,
      tasks: [
        { id: "t8", title: "Register for race event", completed: false, xp: 30 },
        { id: "t9", title: "Complete 15K training run", completed: false, xp: 90 },
        { id: "t10", title: "Practice race-day nutrition", completed: false, xp: 45 },
        { id: "t11", title: "Do 2 dress rehearsal runs", completed: false, xp: 65 },
        { id: "t12", title: "Taper week — reduce volume", completed: false, xp: 35 },
      ],
    },
  ],
};

export const MOCK_DREAM_DETAILS = {
  "1": {
    id: "1",
    title: "Launch my SaaS Platform",
    description: "Build and deploy a production-grade multi-tenant HR platform with 10k users",
    category: "career",
    categoryLabel: "Career & Work",
    progress: 62,
    totalTasks: 14,
    completedTasks: 9,
    xpEarned: 1240,
    timeframe: "3 months",
    status: "active",
    createdAt: "Oct 5, 2025",
    milestones: [
      { id: "m1", title: "MVP feature list finalized", date: "Oct 20, 2025", completed: true },
      { id: "m2", title: "Auth & database models done", date: "Nov 15, 2025", completed: true },
      { id: "m3", title: "API endpoints complete", date: "Jan 10, 2026", completed: false, active: true },
      { id: "m4", title: "Beta launch with 100 users", date: "Feb 15, 2026", completed: false },
      { id: "m5", title: "Production launch", date: "Mar 20, 2026", completed: false },
    ],
    goals: [
      {
        id: "g1", title: "Design & Planning", order: 0, completed: true,
        tasks: [
          { id: "t1", title: "Define MVP feature list", completed: true, xp: 40 },
          { id: "t2", title: "Create wireframes for all screens", completed: true, xp: 60 },
          { id: "t3", title: "Set up project repo and CI/CD", completed: true, xp: 50 },
        ],
      },
      {
        id: "g2", title: "Backend Development", order: 1, completed: true,
        tasks: [
          { id: "t4", title: "Build authentication system", completed: true, xp: 80 },
          { id: "t5", title: "Create database models and migrations", completed: true, xp: 70 },
          { id: "t6", title: "Implement REST API endpoints", completed: true, xp: 90 },
          { id: "t7", title: "Add multi-tenant data isolation", completed: true, xp: 100 },
        ],
      },
      {
        id: "g3", title: "Frontend & Integration", order: 2, completed: false,
        tasks: [
          { id: "t8", title: "Build dashboard UI components", completed: true, xp: 70 },
          { id: "t9", title: "Integrate frontend with API", completed: true, xp: 80 },
          { id: "t10", title: "Add real-time notifications", completed: false, xp: 60 },
          { id: "t11", title: "Implement role-based access control UI", completed: false, xp: 75 },
        ],
      },
      {
        id: "g4", title: "Launch Preparation", order: 3, completed: false,
        tasks: [
          { id: "t12", title: "Write unit and integration tests", completed: false, xp: 65 },
          { id: "t13", title: "Set up monitoring and logging", completed: false, xp: 50 },
          { id: "t14", title: "Deploy to production and onboard first users", completed: false, xp: 120 },
        ],
      },
    ],
  },
  "2": {
    id: "2",
    title: "Learn Piano in 6 Months",
    description: "Master 10 worship songs and be able to play in church by summer",
    category: "hobbies",
    categoryLabel: "Hobbies & Creativity",
    progress: 35,
    totalTasks: 11,
    completedTasks: 4,
    xpEarned: 380,
    timeframe: "6 months",
    status: "active",
    createdAt: "Nov 1, 2025",
    milestones: [
      { id: "m1", title: "Learn all major chords", date: "Nov 30, 2025", completed: true },
      { id: "m2", title: "Play first song hands together", date: "Dec 20, 2025", completed: true },
      { id: "m3", title: "Master 5 songs", date: "Feb 28, 2026", completed: false, active: true },
      { id: "m4", title: "Play with a metronome at tempo", date: "Apr 1, 2026", completed: false },
      { id: "m5", title: "Perform in church service", date: "May 2026", completed: false },
    ],
    goals: [
      {
        id: "g1", title: "Music Theory Basics", order: 0, completed: true,
        tasks: [
          { id: "t1", title: "Learn all major and minor chords", completed: true, xp: 50 },
          { id: "t2", title: "Understand chord progressions (I-IV-V-I)", completed: true, xp: 40 },
          { id: "t3", title: "Practice scales for 15 min daily", completed: true, xp: 35 },
        ],
      },
      {
        id: "g2", title: "Build Playing Skills", order: 1, completed: false,
        tasks: [
          { id: "t4", title: "Play hands together smoothly", completed: true, xp: 60 },
          { id: "t5", title: "Learn 3 worship songs at slow tempo", completed: false, xp: 70 },
          { id: "t6", title: "Practice chord transitions without looking", completed: false, xp: 55 },
          { id: "t7", title: "Play along with backing tracks", completed: false, xp: 45 },
        ],
      },
      {
        id: "g3", title: "Performance Preparation", order: 2, completed: false,
        tasks: [
          { id: "t8", title: "Master 10 worship songs at full tempo", completed: false, xp: 90 },
          { id: "t9", title: "Practice performing in front of family", completed: false, xp: 40 },
          { id: "t10", title: "Rehearse with church worship team", completed: false, xp: 65 },
          { id: "t11", title: "Perform in Sunday service", completed: false, xp: 100 },
        ],
      },
    ],
  },
  "3": {
    id: "3",
    title: "Run a Half Marathon",
    description: "Train progressively and complete a 21km race in under 2 hours",
    category: "health",
    categoryLabel: "Health & Fitness",
    progress: 42,
    totalTasks: 12,
    completedTasks: 5,
    xpEarned: 580,
    timeframe: "6 months",
    status: "active",
    createdAt: "Nov 12, 2025",
    milestones: [
      { id: "m1", title: "Complete first 5K run", date: "Dec 15, 2025", completed: true },
      { id: "m2", title: "Run 10K under 55 minutes", date: "Jan 20, 2026", completed: true },
      { id: "m3", title: "Complete a 15K training run", date: "Feb 28, 2026", completed: false, active: true },
      { id: "m4", title: "Run 18K at race pace", date: "Mar 30, 2026", completed: false },
      { id: "m5", title: "Race Day — 21K", date: "May 1, 2026", completed: false },
    ],
    goals: [
      {
        id: "g1", title: "Build Base Endurance", order: 0, completed: true,
        tasks: [
          { id: "t1", title: "Run 3x per week for 4 weeks", completed: true, xp: 50 },
          { id: "t2", title: "Complete 5K without stopping", completed: true, xp: 75 },
          { id: "t3", title: "Establish morning run routine", completed: true, xp: 40 },
        ],
      },
      {
        id: "g2", title: "Increase Distance", order: 1, completed: false,
        tasks: [
          { id: "t4", title: "Run 8K comfortably", completed: true, xp: 60 },
          { id: "t5", title: "Complete 10K under 55 min", completed: true, xp: 80 },
          { id: "t6", title: "Weekly long run of 12K", completed: false, xp: 70 },
          { id: "t7", title: "Add hill training 1x/week", completed: false, xp: 55 },
        ],
      },
      {
        id: "g3", title: "Race Preparation", order: 2, completed: false,
        tasks: [
          { id: "t8", title: "Register for race event", completed: false, xp: 30 },
          { id: "t9", title: "Complete 15K training run", completed: false, xp: 90 },
          { id: "t10", title: "Practice race-day nutrition", completed: false, xp: 45 },
          { id: "t11", title: "Do 2 dress rehearsal runs", completed: false, xp: 65 },
          { id: "t12", title: "Taper week — reduce volume", completed: false, xp: 35 },
        ],
      },
    ],
  },
  "4": {
    id: "4",
    title: "Save $15,000 Emergency Fund",
    description: "Build a solid financial safety net within 12 months",
    category: "finance",
    categoryLabel: "Finance",
    progress: 88,
    totalTasks: 10,
    completedTasks: 8,
    xpEarned: 950,
    timeframe: "12 months",
    status: "active",
    createdAt: "Sep 1, 2025",
    milestones: [
      { id: "m1", title: "Save first $1,000", date: "Oct 1, 2025", completed: true },
      { id: "m2", title: "Reach $5,000 saved", date: "Dec 15, 2025", completed: true },
      { id: "m3", title: "Reach $10,000 saved", date: "Feb 1, 2026", completed: true },
      { id: "m4", title: "Hit $13,000 milestone", date: "Feb 20, 2026", completed: false, active: true },
      { id: "m5", title: "Goal complete — $15,000", date: "Mar 15, 2026", completed: false },
    ],
    goals: [
      {
        id: "g1", title: "Set Up Savings System", order: 0, completed: true,
        tasks: [
          { id: "t1", title: "Open high-yield savings account", completed: true, xp: 30 },
          { id: "t2", title: "Set up automatic monthly transfer", completed: true, xp: 40 },
          { id: "t3", title: "Create monthly budget spreadsheet", completed: true, xp: 35 },
        ],
      },
      {
        id: "g2", title: "Reduce Expenses", order: 1, completed: true,
        tasks: [
          { id: "t4", title: "Cancel unused subscriptions", completed: true, xp: 25 },
          { id: "t5", title: "Meal prep to cut food costs", completed: true, xp: 45 },
          { id: "t6", title: "Negotiate lower phone/internet bills", completed: true, xp: 50 },
        ],
      },
      {
        id: "g3", title: "Increase Income", order: 2, completed: false,
        tasks: [
          { id: "t7", title: "Take on freelance project", completed: true, xp: 80 },
          { id: "t8", title: "Sell unused items online", completed: true, xp: 35 },
          { id: "t9", title: "Ask for a raise or negotiate contract", completed: false, xp: 90 },
          { id: "t10", title: "Reach $15,000 target", completed: false, xp: 120 },
        ],
      },
    ],
  },
};

export const MOCK_CONVERSATIONS = [
  { id: "c1", type: "dream_coaching", title: "SaaS Platform Planning", dreamTitle: "Launch my SaaS", lastMessage: "Let's review your API endpoints...", time: new Date(Date.now() - 1000 * 60 * 12), unread: 2, pinned: true, messageCount: 24 },
  { id: "c2", type: "check_in", title: "Daily Check-in", dreamTitle: null, lastMessage: "Great progress today! You completed 3 tasks.", time: new Date(Date.now() - 1000 * 60 * 60 * 2), unread: 0, pinned: true, messageCount: 156 },
  { id: "c3", type: "planning", title: "Marathon Training Plan", dreamTitle: "Run a Half Marathon", lastMessage: "I've adjusted your weekly mileage...", time: new Date(Date.now() - 1000 * 60 * 60 * 5), unread: 1, pinned: false, messageCount: 42 },
  { id: "c4", type: "motivation", title: "Motivation Boost", dreamTitle: null, lastMessage: "Remember why you started this journey!", time: new Date(Date.now() - 1000 * 60 * 60 * 24), unread: 0, pinned: false, messageCount: 18 },
  { id: "c5", type: "buddy_chat", title: "Alex", dreamTitle: "Run a Half Marathon", lastMessage: "How was your morning run?", time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), unread: 0, pinned: false, messageCount: 89 },
  { id: "c6", type: "dream_creation", title: "New Dream Brainstorm", dreamTitle: null, lastMessage: "That's a fantastic goal! Let me help...", time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), unread: 0, pinned: false, messageCount: 12 },
];

export const MOCK_AI_MESSAGES = [
  { id: "1", content: "Hi! I want to make progress on my SaaS platform today. What should I focus on?", isUser: true, time: new Date(Date.now() - 1000 * 60 * 60 * 25), pinned: false, liked: false },
  { id: "2", content: "Great to see you motivated! Based on your current progress, you've completed the authentication system and the database models. I'd recommend focusing on these two areas today:\n\n1. **API Endpoints** — You have 3 remaining endpoints for the user management module. These are critical for the frontend integration.\n\n2. **Testing** — Write unit tests for the auth flow you completed yesterday. This will save you debugging time later.\n\nWhich one would you like to start with?", isUser: false, time: new Date(Date.now() - 1000 * 60 * 60 * 25 + 60000), pinned: true, liked: true },
  { id: "3", content: "Let's go with the API endpoints first. Can you help me plan the structure?", isUser: true, time: new Date(Date.now() - 1000 * 60 * 15), pinned: false, liked: false },
  { id: "4", content: "Here's a solid structure for your user management endpoints:\n\n**GET /api/users/** — List users with pagination and filtering\n**POST /api/users/** — Create new user with validation\n**GET /api/users/:id/** — Retrieve user detail\n**PATCH /api/users/:id/** — Update user fields\n**DELETE /api/users/:id/** — Soft delete user\n\nFor each endpoint, you'll want to implement:\n- Serializer validation\n- Permission checks (is_admin vs is_owner)\n- Proper error responses\n\nShall I help you with the serializer code first?", isUser: false, time: new Date(Date.now() - 1000 * 60 * 14), pinned: true, liked: false },
  { id: "5", content: "Yes please! Start with the user list serializer and the create endpoint. I want proper validation.", isUser: true, time: new Date(Date.now() - 1000 * 60 * 10), pinned: false, liked: false },
  { id: "6", content: "Here's the serializer for the user list and create:\n\n**UserSerializer** handles both read and write. For create, it validates:\n- Email uniqueness\n- Password strength (min 8 chars, mixed case, number)\n- Required fields (first_name, last_name)\n\nThe list endpoint uses **pagination** with cursor-based navigation for performance at scale. I've also added **filtering** by role, status, and date joined.\n\nWant me to also include the permission classes?", isUser: false, time: new Date(Date.now() - 1000 * 60 * 8), pinned: false, liked: true },
];

export const MOCK_BUDDY_MESSAGES = [
  { id: "b1", content: "Hey! How's the training going this week?", isUser: false, time: new Date(Date.now() - 1000 * 60 * 60 * 4), read: true, pinned: false, liked: false },
  { id: "b2", content: "Pretty good! I hit 10K yesterday in 52 minutes 🎉", isUser: true, time: new Date(Date.now() - 1000 * 60 * 60 * 3.5), read: true, pinned: false, liked: true },
  { id: "b3", content: "That's awesome! Under 55 min goal crushed! What's your secret?", isUser: false, time: new Date(Date.now() - 1000 * 60 * 60 * 3), read: true, pinned: false, liked: false },
  { id: "b4", content: "Honestly, the interval training you suggested last week made a huge difference. Those 400m repeats are brutal but effective.", isUser: true, time: new Date(Date.now() - 1000 * 60 * 60 * 2.5), read: true, pinned: true, liked: false },
  { id: "b5", content: "Glad it helped! I've been doing the same. My pace dropped from 5:45 to 5:20/km. We should do a long run together this weekend?", isUser: false, time: new Date(Date.now() - 1000 * 60 * 60 * 2), read: true, pinned: false, liked: false },
  { id: "b6", content: "That would be great! Saturday morning?", isUser: true, time: new Date(Date.now() - 1000 * 60 * 45), read: true, pinned: false, liked: false },
  { id: "b7", content: "Perfect, 7 AM at the usual park trail? We can aim for 14K.", isUser: false, time: new Date(Date.now() - 1000 * 60 * 30), read: true, pinned: false, liked: false },
  { id: "b8", content: "Let's do it! 💪 I'll bring the energy gels.", isUser: true, time: new Date(Date.now() - 1000 * 60 * 20), read: false, pinned: false, liked: false },
];

export const MOCK_BUDDY = {
  id: "buddy1",
  name: "Alex",
  initial: "A",
  level: 10,
  online: true,
  compatibility: 87,
  pairedDate: "3 weeks ago",
  streakDays: 12,
  xp: 1800,
  sharedDreams: ["Run a Half Marathon"],
  sharedCategories: ["Health & Fitness", "Personal Growth"],
};

export const MOCK_BUDDY_SUGGESTIONS = [
  { id: "bs1", name: "Sophie", initial: "S", level: 9, compatibility: 82, bio: "Fitness enthusiast working on my first triathlon", sharedDreams: ["Run a Half Marathon"], categories: ["Health", "Career"], streak: 14, mutualFriends: 3, joinedDate: "Aug 2025", achievements: ["10-Day Streak", "Level 5", "First Dream"], sent: false },
  { id: "bs2", name: "Liam", initial: "L", level: 7, compatibility: 76, bio: "Building a tech startup while staying fit", sharedDreams: ["Launch my SaaS Platform"], categories: ["Career", "Health"], streak: 8, mutualFriends: 1, joinedDate: "Oct 2025", achievements: ["7-Day Streak", "Dream Master"], sent: false },
  { id: "bs3", name: "Nina", initial: "N", level: 11, compatibility: 71, bio: "Creative soul on a journey of self-improvement", sharedDreams: [], categories: ["Hobbies", "Growth"], streak: 21, mutualFriends: 2, joinedDate: "Jul 2025", achievements: ["21-Day Streak", "Level 10", "Social Star"], sent: false },
  { id: "bs4", name: "Kai", initial: "K", level: 6, compatibility: 68, bio: "Financial freedom is my goal this year", sharedDreams: ["Save $15,000"], categories: ["Finance", "Career"], streak: 5, mutualFriends: 0, joinedDate: "Dec 2025", achievements: ["First Dream", "5-Day Streak"], sent: false },
];

export const MOCK_LEADERBOARD = [
  { id: "l1", name: "Jade", initial: "J", xp: 3800, level: 15, rank: 1, streak: 28 },
  { id: "l2", name: "Marco", initial: "M", xp: 3200, level: 14, rank: 2, streak: 21 },
  { id: "l3", name: "Lisa", initial: "L", xp: 2900, level: 12, rank: 3, streak: 18 },
  { id: "l4", name: "Stephane", initial: "S", xp: 2450, level: 12, rank: 4, streak: 7, isUser: true },
  { id: "l5", name: "Alex", initial: "A", xp: 2200, level: 10, rank: 5, streak: 12 },
  { id: "l6", name: "Sophie", initial: "S", xp: 1950, level: 9, rank: 6, streak: 14 },
  { id: "l7", name: "Daniel", initial: "D", xp: 1700, level: 8, rank: 7, streak: 9 },
];

export const MOCK_FRIENDS = [
  { id: "f1", name: "Alex", initial: "A", level: 10, online: true },
  { id: "f2", name: "Sophie", initial: "S", level: 9, online: true },
  { id: "f3", name: "Marco", initial: "M", level: 14, online: false },
  { id: "f4", name: "Lisa", initial: "L", level: 12, online: true },
  { id: "f5", name: "Daniel", initial: "D", level: 8, online: false },
];

export const MOCK_FRIEND_REQUESTS = [
  { id: "fr1", name: "Emma", initial: "E", level: 7, mutualFriends: 2, time: "2 hours ago" },
  { id: "fr2", name: "Noah", initial: "N", level: 11, mutualFriends: 4, time: "1 day ago" },
];

export const MOCK_ACTIVITY_FEED = [
  { id: "af1", user: { name: "Alex", initial: "A" }, type: "level_up", content: "reached Level 10!", time: "2h ago", likes: 5, comments: 2 },
  { id: "af2", user: { name: "Sophie", initial: "S" }, type: "task_completed", content: "completed \"Run 10K under 55 min\"", time: "4h ago", likes: 8, comments: 3 },
  { id: "af3", user: { name: "Marco", initial: "M" }, type: "dream_created", content: "started a new dream: \"Learn Italian\"", time: "6h ago", likes: 12, comments: 5 },
  { id: "af4", user: { name: "Lisa", initial: "L" }, type: "streak", content: "hit a 18-day streak! 🔥", time: "1d ago", likes: 15, comments: 4 },
  { id: "af5", user: { name: "Daniel", initial: "D" }, type: "task_completed", content: "completed \"Save $500 this month\"", time: "2d ago", likes: 6, comments: 1 },
];

export const MOCK_CALENDAR_EVENTS = [
  { id: "e1", title: "Morning Run - 8K", time: "7:00 AM", type: "task", completed: false, dreamTitle: "Half Marathon", color: "#10B981", date: new Date() },
  { id: "e2", title: "Review API endpoints", time: "10:00 AM", type: "task", completed: true, dreamTitle: "SaaS Platform", color: "#8B5CF6", date: new Date() },
  { id: "e3", title: "Piano Practice", time: "6:00 PM", type: "task", completed: false, dreamTitle: "Learn Piano", color: "#EC4899", date: new Date() },
  { id: "e4", title: "Budget Review", time: "8:00 PM", type: "event", completed: false, dreamTitle: "Emergency Fund", color: "#FCD34D", date: new Date() },
  { id: "e5", title: "Long Run - 12K", time: "7:00 AM", type: "task", completed: false, dreamTitle: "Half Marathon", color: "#10B981", date: new Date(Date.now() + 86400000) },
  { id: "e6", title: "Deploy staging server", time: "2:00 PM", type: "task", completed: false, dreamTitle: "SaaS Platform", color: "#8B5CF6", date: new Date(Date.now() + 86400000) },
  { id: "e7", title: "Hill training", time: "6:30 AM", type: "task", completed: false, dreamTitle: "Half Marathon", color: "#10B981", date: new Date(Date.now() + 86400000 * 3) },
  { id: "e8", title: "Team meeting", time: "11:00 AM", type: "event", completed: false, dreamTitle: "SaaS Platform", color: "#8B5CF6", date: new Date(Date.now() + 86400000 * 3) },
  { id: "e9", title: "Transfer to savings", time: "9:00 AM", type: "task", completed: false, dreamTitle: "Emergency Fund", color: "#FCD34D", date: new Date(Date.now() + 86400000 * 5) },
  { id: "e10", title: "Recovery run", time: "7:00 AM", type: "task", completed: false, dreamTitle: "Half Marathon", color: "#10B981", date: new Date(Date.now() + 86400000 * 6) },
];

export const MOCK_NOTIFICATIONS = [
  { id: "n1", type: "dream_progress", title: "Dream Progress", message: "You're 62% done with your SaaS Platform dream!", time: "10 min ago", read: false, icon: "🎯" },
  { id: "n2", type: "friend_request", title: "Friend Request", message: "Emma wants to be your friend", time: "2 hours ago", read: false, icon: "👋" },
  { id: "n3", type: "achievement", title: "Achievement Unlocked!", message: "You earned the '7-Day Streak' badge!", time: "5 hours ago", read: false, icon: "🏆" },
  { id: "n4", type: "buddy", title: "Buddy Update", message: "Alex completed a training milestone!", time: "1 day ago", read: true, icon: "🤝" },
  { id: "n5", type: "reminder", title: "Task Reminder", message: "Don't forget: Morning Run - 8K at 7:00 AM", time: "1 day ago", read: true, icon: "⏰" },
  { id: "n6", type: "social", title: "Social Update", message: "Sophie liked your achievement", time: "2 days ago", read: true, icon: "❤️" },
  { id: "n7", type: "system", title: "Welcome Back!", message: "You've maintained a 7-day streak. Keep going!", time: "3 days ago", read: true, icon: "✨" },
  { id: "n8", type: "dream_progress", title: "Milestone Reached", message: "You completed 'Run 10K under 55 min'!", time: "4 days ago", read: true, icon: "🎯" },
];

export const MOCK_STORE_ITEMS = [
  { id: "s1", name: "Galaxy Frame", type: "badge_frame", rarity: "epic", price: 500, description: "A swirling galaxy border for your profile badge", equipped: false, owned: false, image: "🌌" },
  { id: "s2", name: "Aurora Skin", type: "theme_skin", rarity: "legendary", price: 1200, description: "Northern lights theme for your app", equipped: false, owned: false, image: "🌈" },
  { id: "s3", name: "Star Crown", type: "avatar_decoration", rarity: "rare", price: 300, description: "A crown of stars above your avatar", equipped: false, owned: true, image: "👑" },
  { id: "s4", name: "Neon Bubble", type: "chat_bubble", rarity: "rare", price: 250, description: "Neon-glow chat message bubbles", equipped: true, owned: true, image: "💬" },
  { id: "s5", name: "Shield of Persistence", type: "streak_shield", rarity: "epic", price: 800, description: "Protects your streak for one missed day", equipped: false, owned: false, image: "🛡️" },
  { id: "s6", name: "Double XP Potion", type: "xp_booster", rarity: "common", price: 150, description: "Double XP for 24 hours", equipped: false, owned: true, image: "⚡" },
  { id: "s7", name: "Crystal Frame", type: "badge_frame", rarity: "common", price: 100, description: "A clean crystal border for your badge", equipped: false, owned: false, image: "💎" },
  { id: "s8", name: "Midnight Theme", type: "theme_skin", rarity: "rare", price: 400, description: "Deep midnight blue theme", equipped: false, owned: false, image: "🌙" },
  { id: "s9", name: "Fire Wings", type: "avatar_decoration", rarity: "legendary", price: 1500, description: "Flaming wings around your avatar", equipped: false, owned: false, image: "🔥" },
  { id: "s10", name: "Cosmic Bubble", type: "chat_bubble", rarity: "epic", price: 600, description: "Space-themed chat bubbles with stars", equipped: false, owned: false, image: "🚀" },
];

export const MOCK_SUBSCRIPTION_PLANS = [
  {
    id: "free", name: "Free", price: 0, period: "forever",
    features: ["3 Active Dreams", "Basic AI Coaching", "Daily Check-ins", "Community Access", "Basic Stats"],
    limitations: ["Limited AI conversations", "No buddy matching", "No store access", "Ads"],
  },
  {
    id: "premium", name: "Premium", price: 9.99, period: "month",
    features: ["10 Active Dreams", "Advanced AI Coaching", "Unlimited Conversations", "Buddy Matching", "Full Leaderboard", "Store Access", "Custom Themes", "Priority Support"],
    limitations: ["No vision board", "No dream collaboration"],
    popular: true,
  },
  {
    id: "pro", name: "Pro", price: 19.99, period: "month",
    features: ["Unlimited Dreams", "Premium AI (GPT-4)", "Vision Board Generation", "Dream Collaboration", "Advanced Analytics", "API Access", "White-label Options", "Dedicated Support", "All Premium Features"],
    limitations: [],
  },
];

export const MOCK_CIRCLES = [
  { id: "cr1", name: "Morning Runners", category: "Health", memberCount: 128, description: "Early birds who love running at dawn", isJoined: true, posts: 342, activeChallenge: "Run 50K this month" },
  { id: "cr2", name: "Indie Hackers", category: "Career", memberCount: 256, description: "Building products and sharing the journey", isJoined: true, posts: 891, activeChallenge: "Ship a feature this week" },
  { id: "cr3", name: "Mindful Living", category: "Growth", memberCount: 89, description: "Meditation, journaling, and personal growth", isJoined: false, posts: 156, activeChallenge: null },
  { id: "cr4", name: "Financial Freedom", category: "Finance", memberCount: 201, description: "Saving, investing, and building wealth together", isJoined: false, posts: 423, activeChallenge: "No-spend weekend" },
  { id: "cr5", name: "Creative Corner", category: "Hobbies", memberCount: 167, description: "Artists, musicians, writers — all creatives welcome", isJoined: true, posts: 567, activeChallenge: "Create something daily" },
];

export const MOCK_DREAM_TEMPLATES = [
  { id: "dt1", title: "Run a Marathon", category: "health", description: "Complete training plan from couch to 42K", goalCount: 5, duration: "6 months", difficulty: "Hard", popular: true },
  { id: "dt2", title: "Launch a Side Project", category: "career", description: "From idea to shipped product in 90 days", goalCount: 7, duration: "3 months", difficulty: "Medium", popular: true },
  { id: "dt3", title: "Learn a New Language", category: "personal", description: "Reach conversational fluency in a new language", goalCount: 6, duration: "12 months", difficulty: "Medium", popular: false },
  { id: "dt4", title: "Build an Emergency Fund", category: "finance", description: "Save 3-6 months of expenses systematically", goalCount: 4, duration: "12 months", difficulty: "Easy", popular: true },
  { id: "dt5", title: "Learn Guitar", category: "hobbies", description: "Play 10 songs from scratch", goalCount: 5, duration: "6 months", difficulty: "Medium", popular: false },
  { id: "dt6", title: "Get in Shape", category: "health", description: "Structured fitness plan with nutrition", goalCount: 6, duration: "3 months", difficulty: "Medium", popular: true },
  { id: "dt7", title: "Start a YouTube Channel", category: "career", description: "Create and publish your first 10 videos", goalCount: 5, duration: "3 months", difficulty: "Hard", popular: false },
  { id: "dt8", title: "Read 24 Books", category: "personal", description: "2 books per month for a year", goalCount: 12, duration: "12 months", difficulty: "Easy", popular: false },
];

export const CATEGORIES = {
  career: { color: "#8B5CF6", label: "Career" },
  hobbies: { color: "#EC4899", label: "Hobbies" },
  health: { color: "#10B981", label: "Health" },
  finance: { color: "#FCD34D", label: "Finance" },
  personal: { color: "#6366F1", label: "Growth" },
  relationships: { color: "#14B8A6", label: "Social" },
};

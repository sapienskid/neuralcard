# NeuralCard Professional Roadmap
## Making It a World-Class Spaced Repetition System

---

## 🎯 Current State Assessment

### ✅ What's Working Well
- **FSRS Algorithm**: Properly implemented with ts-fsrs library
- **Basic Review Flow**: Show question → Show answer → Rate (Again/Hard/Good/Easy)
- **Deck Organization**: Folder-based grouping with collapsible sections
- **PouchDB Sync**: Bidirectional sync with CouchDB for cross-device use
- **Statistics**: Basic charts for activity and forecast
- **Card Types**: Basic (Front/Back) and Cloze deletion support

### ⚠️ Current Limitations
- No image/audio support in cards
- Limited statistics and analytics
- No tag-based filtering or organization
- No card templates or styling options
- Missing advanced review features ( burying, suspending)
- No retention tracking or optimization
- Mobile experience not optimized
- No import/export from other SRS (Anki, etc.)

---

## 🏆 Professional Feature Roadmap

### Phase 1: Core Experience Enhancement (Immediate)

#### 1.1 Media Support
- **Images**: Drag & drop, paste from clipboard, Obsidian embed syntax
- **Audio**: Text-to-speech integration, audio playback buttons
- **LaTeX**: MathJax support for equations
- **Code highlighting**: Syntax highlighting in code blocks

#### 1.2 Card Enhancements
- **Card Templates**: Multiple card types (Basic, Cloze, Type-in answer, Image occlusion)
- **Card Styling**: Custom CSS per deck, night mode optimization
- **Card Flags**: Mark cards (Red/Orange/Green/Blue) for review
- **Card Notes**: Add personal notes to cards during review

#### 1.3 Review Experience
- **Keyboard Shortcuts**: Space/Enter to show answer, 1-4 for ratings
- **Undo Last Review**: Ctrl+Z to undo accidental ratings
- **Skip/Bury Cards**: Temporary hide cards until next day
- **Suspend Cards**: Long-term disable cards
- **Mark Cards**: Flag for later review

### Phase 2: Advanced Analytics (Week 2-3)

#### 2.1 Comprehensive Statistics Dashboard
```
📊 Statistics Page Structure:
├── Overview
│   ├── Total cards, reviews today, retention rate
│   ├── Study streak (consecutive days)
│   ├── Time spent studying
│   └── Cards per minute
├── Performance Metrics
│   ├── Retention rate by difficulty
│   ├── Average time per card
│   ├── Rating distribution (Again/Hard/Good/Easy %)
│   └── Forgetting curve visualization
├── Progress Tracking
│   ├── Cards matured over time
│   ├── Learning velocity (cards/day)
│   ├── Forecast accuracy
│   └── Interval growth chart
└── Deck Analytics
    ├── Per-deck retention rates
    ├── Difficulty distribution
    └── Performance heatmap
```

#### 2.2 FSRS Optimization
- **Parameter Calibration**: Auto-tune FSRS weights based on performance
- **Retention Target**: Visual indicator of actual vs target retention
- **Difficulty Analysis**: Show which cards are hardest
- **Interval Analysis**: Optimize intervals based on forgetting patterns

### Phase 3: Organization & Management (Week 3-4)

#### 3.1 Tag System
- **Global Tags**: Tag cards across decks
- **Tag Browser**: View cards by tag
- **Tag Hierarchy**: Nested tags (e.g., #lang/spanish/vocabulary)
- **Filter by Tags**: Custom study sessions with tag filters

#### 3.2 Advanced Study Modes
- **Custom Study Sessions**:
  - Study by tag
  - Study failed cards only
  - Study new cards only
  - Cram mode (all cards, ignore limits)
  - Filter by creation date
- **Study Presets**: Save frequently used filters

#### 3.3 Deck Management
- **Deck Statistics**: Per-deck analytics
- **Deck Sharing**: Export/import deck with scheduling
- **Deck Templates**: Pre-made card layouts
- **Bulk Operations**: Tag multiple cards, move cards between decks

### Phase 4: Sync & Collaboration (Week 4-5)

#### 4.1 Enhanced Sync
- **Conflict Resolution UI**: Visual merge tool for sync conflicts
- **Sync History**: View what changed in each sync
- **Selective Sync**: Choose which decks to sync
- **Offline Mode**: Better handling of offline periods

#### 4.2 Collaboration Features
- **Shared Decks**: Collaborate on decks with others
- **Deck Publishing**: Share decks publicly
- **Review Comments**: Add comments for other learners

### Phase 5: Mobile & Performance (Week 5-6)

#### 5.1 Mobile Experience
- **Touch-Optimized UI**: Larger buttons, swipe gestures
- **Mobile Review**: Full-screen immersive mode
- **Offline Support**: Better caching for mobile
- **Quick Add**: Fast card creation on mobile

#### 5.2 Performance Optimization
- **Lazy Loading**: Load cards on-demand
- **Database Optimization**: IndexedDB performance tuning
- **Image Optimization**: Lazy load images, compression
- **Background Sync**: Sync when app is closed

---

## 🔧 Technical Architecture Improvements

### Database Schema Evolution
```typescript
// Enhanced Card Document
interface EnhancedCardStateDoc {
  _id: string;
  type: 'card_state';
  
  // FSRS Core
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
  
  // Enhanced Metadata
  created_at: string;
  updated_at: string;
  first_review?: string;
  total_time_spent: number; // seconds
  
  // Organization
  tags: string[];
  flags: ('red' | 'orange' | 'green' | 'blue')[];
  suspended: boolean;
  buried_until?: string;
  
  // Content Hash (for detecting edits)
  content_hash: string;
  
  // Media
  media_ids: string[];
}

// Review Log with Enhanced Data
interface EnhancedReviewLogDoc {
  _id: string;
  type: 'review_log';
  cardId: string;
  timestamp: number;
  rating: Rating;
  
  // Enhanced Metrics
  time_spent: number; // seconds to answer
  previous_state: number;
  new_state: number;
  previous_due: string;
  new_due: string;
  
  // Context
  study_session_id: string;
  deck_id: string;
}

// Study Session Tracking
interface StudySessionDoc {
  _id: string;
  type: 'study_session';
  started_at: string;
  ended_at?: string;
  deck_id?: string; // null for custom sessions
  cards_reviewed: number;
  total_time: number;
  tags?: string[];
}
```

### Performance Optimizations

1. **Indexed Queries**:
   ```javascript
   // Create indexes for common queries
   await db.createIndex({
     index: { fields: ['type', 'due', 'state'] }
   });
   await db.createIndex({
     index: { fields: ['type', 'tags'] }
   });
   ```

2. **Caching Strategy**:
   - Cache deck list in memory
   - Lazy load card content
   - Preload next 10 cards during review

3. **Background Processing**:
   - Use Web Workers for heavy computations
   - Debounce sync operations
   - Batch database writes

---

## 📱 UI/UX Improvements

### Dashboard Redesign
```
┌─────────────────────────────────────────────┐
│  📊 NeuralCard                    [⚙️] [?]  │
├─────────────────────────────────────────────┤
│  TODAY'S PROGRESS                           │
│  ┌─────────────┐ ┌─────────────┐           │
│  │  Reviews: 15│ │  Time: 12m  │           │
│  │  Due: 23    │ │  Streak: 5🔥│           │
│  └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────┤
│  QUICK ACTIONS                              │
│  [🎯 Study All Due] [🆕 Study New]         │
│  [📈 Statistics] [⚙️ Settings]             │
├─────────────────────────────────────────────┤
│  DECKS                                      │
│  ▼ 📁 Spanish                               │
│    📄 Vocabulary (Due: 5, New: 3) [Study]  │
│    📄 Grammar (Due: 2, New: 0) [Study]     │
│  ▶ 📁 Science                               │
│    📄 Biology (Due: 8, New: 5) [Study]     │
├─────────────────────────────────────────────┤
│  RECENTLY STUDIED                           │
│  • Spanish Vocabulary - 2 hours ago        │
│  • Biology - Yesterday                     │
└─────────────────────────────────────────────┘
```

### Review Interface Enhancements
- **Progress Bar**: Visual indicator of session progress
- **Time Tracker**: Show time spent on current card
- **Card Counter**: X of Y cards remaining
- **Preview Mode**: Show next card's deck/tag before revealing
- **Fullscreen Toggle**: Maximize review area
- **Quick Edit**: Edit card during review

---

## 🎯 Implementation Priority

### Week 1: Foundation
- [ ] Media support (images, audio)
- [ ] Keyboard shortcuts
- [ ] Card flags and notes
- [ ] Enhanced statistics dashboard

### Week 2: Analytics
- [ ] Retention rate tracking
- [ ] Performance charts
- [ ] FSRS parameter calibration
- [ ] Study session tracking

### Week 3: Organization
- [ ] Tag system implementation
- [ ] Custom study sessions
- [ ] Bulk operations
- [ ] Tag browser

### Week 4: Sync & Collaboration
- [ ] Enhanced conflict resolution
- [ ] Selective sync
- [ ] Deck sharing
- [ ] Sync status dashboard

### Week 5: Mobile & Polish
- [ ] Mobile UI optimization
- [ ] Touch gestures
- [ ] Performance tuning
- [ ] Bug fixes

### Week 6: Launch Prep
- [ ] Documentation
- [ ] Onboarding flow
- [ ] Import from Anki
- [ ] Community plugins API

---

## 🚀 Competitive Advantages

1. **Native Obsidian Integration**: Unlike Anki, cards live in your notes
2. **Bi-directional Links**: Cards can reference other notes
3. **Markdown Native**: Use all Obsidian features in cards
4. **Local-First**: Works offline, sync when online
5. **Open Source**: Community-driven improvements
6. **PouchDB Sync**: Self-hostable, no vendor lock-in

---

## 📈 Success Metrics

- **User Retention**: 7-day, 30-day retention rates
- **Study Consistency**: Daily active users
- **Card Completion**: Cards learned vs created
- **Sync Reliability**: Conflict rate < 1%
- **Performance**: <100ms to load review queue
- **Error Rate**: <0.1% crashes or data loss

---

## 💡 Innovation Opportunities

1. **AI-Assisted Learning**:
   - Auto-generate cards from notes
   - Smart card recommendations
   - Difficulty prediction

2. **Spaced Writing**: Write answers instead of just rating

3. **Connected Cards**: Show related cards from bidirectional links

4. **Learning Paths**: Guided sequences of decks

5. **Gamification**: Achievements, levels, streaks

---

**Next Steps**: Start with Phase 1 (Media support + Keyboard shortcuts) to immediately improve user experience, then move to analytics to help users optimize their learning.

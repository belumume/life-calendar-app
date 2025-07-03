# UI/UX Wireframes - MyLife Calendar

## Design Principles
- **Minimalist & Focused**: Clean interface without distractions
- **Privacy-First Visual Language**: Locked/secure iconography
- **Intuitive Navigation**: Maximum 2 clicks to any feature
- **Responsive Design**: Mobile-first, works on all devices
- **Accessible**: WCAG 2.1 AA compliant

## Core Views

### 1. Life View (Life in Weeks)
```
┌─────────────────────────────────────────────────┐
│ [≡] MyLife Calendar              [Settings] [?] │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your Life in Weeks                             │
│  ┌──────────────────────────────────┐          │
│  │ Birth: Jan 1, 1990 (34 years old)│          │
│  └──────────────────────────────────┘          │
│                                                 │
│  Years  0    10    20    30    40    50...     │
│  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐    │
│  │█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│ 0  │
│  ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤    │
│  │█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│ 10 │
│  ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤    │
│  │█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│ 20 │
│  ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤    │
│  │█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│█│░│░│░│░│ 30 │
│  ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤    │
│  │░│░│░│░│░│░│░│░│░│░│░│░│░│░│░│░│░│░│░│░│ 40 │
│                                                 │
│  Legend: █ Lived  ░ Future  ● Current Week      │
│                                                 │
│  [View 88-Day Summer]  [Journal]  [Export Data] │
└─────────────────────────────────────────────────┘
```

### 2. Period View (88-Day Summer Tracker)
```
┌─────────────────────────────────────────────────┐
│ [←] 88 Days of Summer 2025          [Calendar] │
├─────────────────────────────────────────────────┤
│                                                 │
│  Progress: Day 15 of 88 (17%)                   │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
│                                                 │
│  Week 1        Week 2        Week 3             │
│  ┌─┬─┬─┬─┬─┬─┬─┐ ┌─┬─┬─┬─┬─┬─┬─┐ ┌─┬─┬─┬─┬─┬─┬─┐ │
│  │✓│✓│✓│✓│✓│✓│✓│ │✓│✓│✓│✓│✓│✓│✓│ │●│░│░│░│░│░│░│ │
│  └─┴─┴─┴─┴─┴─┴─┘ └─┴─┴─┴─┴─┴─┴─┘ └─┴─┴─┴─┴─┴─┴─┘ │
│                                                 │
│  Daily Achievements:                            │
│  ┌─────────────────────────────────────────┐   │
│  │ Today: Made substantial progress on...   │   │
│  │ ____________________________________    │   │
│  │ [Add Note]                   [Save]     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Recent Entries:                                │
│  • Day 14: Completed project milestone ✨       │
│  • Day 13: Deep work session - 4 hours         │
│  • Day 12: Started new learning track          │
│                                                 │
│  [View All Days]  [Statistics]  [Export]       │
└─────────────────────────────────────────────────┘
```

### 3. Detail View (Single Day/Week)
```
┌─────────────────────────────────────────────────┐
│ [←] Wednesday, June 19, 2025                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  📅 Day 15 of 88 | Week 3                       │
│                                                 │
│  Journal Entry                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ What made today remarkable?              │   │
│  │ _______________________________________  │   │
│  │ _______________________________________  │   │
│  │ _______________________________________  │   │
│  │                                          │   │
│  │ Progress & Achievements:                 │   │
│  │ • ___________________________________   │   │
│  │ • ___________________________________   │   │
│  │                                          │   │
│  │ Tomorrow's Focus:                        │   │
│  │ _______________________________________  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Goals & Habits                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ Morning Routine                       │   │
│  │ ☑ Deep Work (3+ hours)                  │   │
│  │ ☑ Exercise                              │   │
│  │ ☐ Evening Reflection                    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Save Entry]  [Previous Day]  [Next Day]      │
└─────────────────────────────────────────────────┘
```

## Navigation Flow

```
┌──────────┐     ┌────────────┐     ┌──────────┐
│   Home   │ ──> │ Life View  │ ──> │  Detail  │
│  (Setup) │     │  (Weeks)   │     │  (Day)   │
└──────────┘     └────────────┘     └──────────┘
                        │
                        ▼
                 ┌────────────┐
                 │Period View │
                 │ (88 Days)  │
                 └────────────┘
```

## Color Palette

- **Primary**: #1e40af (Blue) - Trust, stability
- **Secondary**: #7c3aed (Purple) - Progress, achievement  
- **Success**: #10b981 (Green) - Completed items
- **Neutral**: #6b7280 (Gray) - Future/inactive
- **Background**: #ffffff (Light) / #111827 (Dark)

## Typography

- **Headings**: System font stack, bold
- **Body**: System font stack, regular
- **Monospace**: For dates/numbers

## Responsive Breakpoints

- Mobile: < 640px (single column)
- Tablet: 640px - 1024px (2 columns)
- Desktop: > 1024px (full layout)

## Interaction States

- **Hover**: Subtle elevation + color shift
- **Active**: Pressed appearance
- **Focus**: Clear outline for accessibility
- **Loading**: Skeleton screens
- **Empty**: Helpful prompts to get started

## Data Privacy Indicators

- 🔒 Lock icon on encrypted data
- 📱 Device-only storage indicator
- ☁️ Sync status (when enabled)
- 💾 Export readiness
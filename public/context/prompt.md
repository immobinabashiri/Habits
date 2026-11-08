[ROLE]

Act as a Senior Product Designer, Product Manager, UX Architect, and Senior Full-Stack Engineer.

You have extensive experience designing sophisticated calendar applications, personal productivity systems, habit trackers, scheduling platforms, and modern SaaS products.

Your task is to conceptualize and implement a comprehensive Calendar & Personal Planning System for Royal Motion.

Think beyond a traditional calendar.

I don’t want a basic calendar where users can simply add notes to specific dates.

I want to build a genuinely useful, well-designed planning system that helps users organize their daily lives, manage their schedules, track activities, and stay consistent with their goals.

[PART 1 — PRODUCT DISCOVERY & ANALYSIS]

Before implementation, thoroughly inspect the existing Royal Motion project.

Understand:

* Current application architecture.
* Existing Dashboard.
* Habit management system.
* Reward and Achievement systems.
* Workout scheduling functionality.
* Existing user data models.
* Notification infrastructure.
* Authentication and user relationships.
* Existing UI components and design system.
* Available date and calendar-related libraries.

Identify opportunities to integrate the new Calendar with existing functionality.

IMPORTANT:

Do not build an isolated calendar that duplicates existing features.

The Calendar should become a central place where users can see and manage information that already exists throughout Royal Motion.

[PART 2 — PRODUCT VISION]

Design a unified Personal Calendar and Planning System.

The system should support several types of activities:

1. Personal Events
2. Daily Tasks
3. Weekly Plans
4. Reminders
5. Notes
6. Habit Scheduling
7. Workout Scheduling
8. Goals and Milestones
9. Important Dates
10. Recurring Activities

Explore how these elements should interact with each other.

For example:

* A user can schedule a workout for Monday at 10 AM.
* A user can create a personal task for Wednesday.
* A user can create a recurring weekly activity.
* A user can add a reminder for a specific date and time.
* Existing Habits can be visualized on their scheduled days.
* Existing Workouts can appear automatically on the calendar.
* A user can create a weekly plan and see how it translates into daily activities.

Avoid unnecessary duplication.

Where an activity already exists elsewhere in the application, prefer integrating and referencing that existing record instead of creating another independent record.

[PART 3 — CALENDAR VIEWS]

Explore and design the most useful calendar views.

At minimum, consider:

A. MONTH VIEW

* Traditional monthly calendar.
* Clear indication of scheduled activities.
* Different visual indicators for activity types.
* Easy navigation between months.
* Ability to select a specific date.
* Quick overview of upcoming events.

B. WEEK VIEW

* Detailed weekly schedule.
* Time-based event positioning.
* Easy visualization of busy and free periods.
* Ability to create events directly within a day or time slot.
* Weekly planning overview.

C. DAY VIEW

* Detailed daily schedule.
* Timeline-based layout.
* Tasks, workouts, events, and reminders.
* Ability to organize activities throughout the day.

D. AGENDA VIEW

* Chronological list of upcoming activities.
* Grouped by date.
* Useful for users who prefer lists over calendar grids.

Evaluate whether additional views would meaningfully improve the experience.

[PART 4 — EVENT & ACTIVITY MANAGEMENT]

Create a flexible system for creating and managing calendar items.

A calendar item may include:

* Title.
* Description.
* Date.
* Start time.
* End time.
* Category.
* Color or visual identifier.
* Priority.
* Completion status.
* Reminder settings.
* Recurrence settings.
* Optional notes.

Support:

* Creating activities.
* Editing activities.
* Deleting activities.
* Rescheduling activities.
* Marking tasks as completed.
* Creating all-day events.
* Creating recurring events.
* Managing reminders.

The creation experience should be simple and intuitive.

Do not overwhelm users with unnecessary fields.

Use progressive disclosure where appropriate.

[PART 5 — WEEKLY PLANNING SYSTEM]

I want users to be able to plan their weeks, not just add isolated events.

Explore a weekly planning experience where users can:

* Define their weekly priorities.
* Schedule important activities.
* Organize recurring routines.
* Allocate time for workouts.
* Schedule personal tasks.
* Review their weekly workload.
* Adjust their plans throughout the week.

A weekly plan should be easy to create and modify.

Consider whether users should be able to create reusable weekly templates.

For example:

A user creates a weekly routine:

Monday:

* Workout.
* Reading.
* Personal task.

Tuesday:

* Workout.
* Learning.
* Work-related task.

This routine could optionally be reused for future weeks.

[PART 6 — HABIT INTEGRATION]

Integrate the existing Habit system into the Calendar.

Requirements:

* Display scheduled Habits on their corresponding dates.
* Show completion status where appropriate.
* Allow users to navigate from a calendar Habit to its existing Habit record.
* Avoid creating duplicate Habit records.
* Respect the existing Habit scheduling and completion logic.

Evaluate whether users should be able to manage certain Habit scheduling actions directly from the Calendar.

[PART 7 — WORKOUT INTEGRATION]

Integrate the existing Workout scheduling system.

Requirements:

* Display scheduled workouts.
* Distinguish workouts from personal events and tasks.
* Show workout completion status where available.
* Allow navigation to workout details.
* Preserve existing workout scheduling logic.
* Avoid duplicate workout records.

The Calendar should provide a unified view of personal and fitness-related activities.

[PART 8 — SMART FEATURES & PRODUCT OPPORTUNITIES]

Think critically about features that could make this Calendar genuinely valuable.

Explore opportunities such as:

* Drag-and-drop rescheduling.
* Quick event creation.
* Recurring schedules.
* Daily overview.
* Upcoming reminders.
* Weekly completion summaries.
* Overdue tasks.
* Missed activities.
* Conflict detection.
* Time allocation insights.
* Weekly planning templates.
* Calendar filtering.
* Search.
* Activity categories.
* Calendar statistics.

You do not need to implement every possible feature.

Prioritize features based on their actual usefulness, simplicity, and compatibility with the existing product.

Avoid feature bloat.

[PART 9 — UI/UX DESIGN]

The Calendar must follow the existing Royal Motion design system.

Important design requirements:

* Consistent Glassmorphism styling.
* Support for all existing themes.
* Responsive desktop and mobile layouts.
* Clean visual hierarchy.
* Beautiful event indicators.
* Smooth transitions.
* Intuitive navigation.
* Well-designed empty states.
* Clear distinction between activity types.

The Calendar should feel like a premium part of Royal Motion, not an externally embedded or disconnected component.

Pay special attention to mobile usability.

[PART 10 — DATA ARCHITECTURE]

Design a scalable and maintainable data architecture.

Requirements:

* Calendar data must be user-specific.
* Recurring activities must be modeled correctly.
* Existing Habit and Workout records should be referenced where appropriate.
* Avoid unnecessary duplication.
* Support future expansion.
* Respect existing authentication and authorization.
* Validate all user inputs.
* Ensure users cannot access another user’s private calendar data.

Carefully consider timezone handling, recurring event behavior, and date consistency.

Do not introduce unnecessary complexity into the existing database architecture.

[PART 11 — IMPLEMENTATION STRATEGY]

Before coding:

1. Analyze the existing application.
2. Identify reusable functionality.
3. Define the Calendar’s scope.
4. Design the user experience.
5. Propose the data architecture.
6. Identify required API endpoints.
7. Identify integration points with Habits and Workouts.
8. Identify potential technical challenges.

Then implement the system using the existing project architecture.

Do not rebuild existing features unnecessarily.

Do not break existing functionality.

Do not introduce unnecessary dependencies.

Do not make unrelated changes to other parts of the application.

[PART 12 — FINAL QUALITY CONTROL]

After implementation, verify:

* All calendar views work correctly.
* Events can be created, edited, and deleted.
* Recurring events behave correctly.
* Weekly planning works.
* Habit integration works.
* Workout integration works.
* User data remains isolated.
* Timezones and dates are handled correctly.
* Responsive layouts work.
* All themes render correctly.
* Existing functionality remains intact.

[FINAL EXPECTATION]

I want a comprehensive, polished, and scalable Calendar & Personal Planning System.

Do not approach this as a simple calendar implementation.

Think like a product designer building a standalone premium productivity product inside Royal Motion.

The final experience should make users want to open their Calendar every day because it genuinely helps them organize their lives, stay consistent, and understand what they need to do next.

Prioritize usefulness, simplicity, integration, and long-term scalability.[ROLE]

Act as a Senior Product Designer, Product Manager, UX Architect, and Senior Full-Stack Engineer.

You have extensive experience designing sophisticated calendar applications, personal productivity systems, habit trackers, scheduling platforms, and modern SaaS products.

Your task is to conceptualize and implement a comprehensive Calendar & Personal Planning System for Royal Motion.

Think beyond a traditional calendar.

I don’t want a basic calendar where users can simply add notes to specific dates.

I want to build a genuinely useful, well-designed planning system that helps users organize their daily lives, manage their schedules, track activities, and stay consistent with their goals.

[PART 1 — PRODUCT DISCOVERY & ANALYSIS]

Before implementation, thoroughly inspect the existing Royal Motion project.

Understand:

* Current application architecture.
* Existing Dashboard.
* Habit management system.
* Reward and Achievement systems.
* Workout scheduling functionality.
* Existing user data models.
* Notification infrastructure.
* Authentication and user relationships.
* Existing UI components and design system.
* Available date and calendar-related libraries.

Identify opportunities to integrate the new Calendar with existing functionality.

IMPORTANT:

Do not build an isolated calendar that duplicates existing features.

The Calendar should become a central place where users can see and manage information that already exists throughout Royal Motion.

[PART 2 — PRODUCT VISION]

Design a unified Personal Calendar and Planning System.

The system should support several types of activities:

1. Personal Events
2. Daily Tasks
3. Weekly Plans
4. Reminders
5. Notes
6. Habit Scheduling
7. Workout Scheduling
8. Goals and Milestones
9. Important Dates
10. Recurring Activities

Explore how these elements should interact with each other.

For example:

* A user can schedule a workout for Monday at 10 AM.
* A user can create a personal task for Wednesday.
* A user can create a recurring weekly activity.
* A user can add a reminder for a specific date and time.
* Existing Habits can be visualized on their scheduled days.
* Existing Workouts can appear automatically on the calendar.
* A user can create a weekly plan and see how it translates into daily activities.

Avoid unnecessary duplication.

Where an activity already exists elsewhere in the application, prefer integrating and referencing that existing record instead of creating another independent record.

[PART 3 — CALENDAR VIEWS]

Explore and design the most useful calendar views.

At minimum, consider:

A. MONTH VIEW

* Traditional monthly calendar.
* Clear indication of scheduled activities.
* Different visual indicators for activity types.
* Easy navigation between months.
* Ability to select a specific date.
* Quick overview of upcoming events.

B. WEEK VIEW

* Detailed weekly schedule.
* Time-based event positioning.
* Easy visualization of busy and free periods.
* Ability to create events directly within a day or time slot.
* Weekly planning overview.

C. DAY VIEW

* Detailed daily schedule.
* Timeline-based layout.
* Tasks, workouts, events, and reminders.
* Ability to organize activities throughout the day.

D. AGENDA VIEW

* Chronological list of upcoming activities.
* Grouped by date.
* Useful for users who prefer lists over calendar grids.

Evaluate whether additional views would meaningfully improve the experience.

[PART 4 — EVENT & ACTIVITY MANAGEMENT]

Create a flexible system for creating and managing calendar items.

A calendar item may include:

* Title.
* Description.
* Date.
* Start time.
* End time.
* Category.
* Color or visual identifier.
* Priority.
* Completion status.
* Reminder settings.
* Recurrence settings.
* Optional notes.

Support:

* Creating activities.
* Editing activities.
* Deleting activities.
* Rescheduling activities.
* Marking tasks as completed.
* Creating all-day events.
* Creating recurring events.
* Managing reminders.

The creation experience should be simple and intuitive.

Do not overwhelm users with unnecessary fields.

Use progressive disclosure where appropriate.

[PART 5 — WEEKLY PLANNING SYSTEM]

I want users to be able to plan their weeks, not just add isolated events.

Explore a weekly planning experience where users can:

* Define their weekly priorities.
* Schedule important activities.
* Organize recurring routines.
* Allocate time for workouts.
* Schedule personal tasks.
* Review their weekly workload.
* Adjust their plans throughout the week.

A weekly plan should be easy to create and modify.

Consider whether users should be able to create reusable weekly templates.

For example:

A user creates a weekly routine:

Monday:

* Workout.
* Reading.
* Personal task.

Tuesday:

* Workout.
* Learning.
* Work-related task.

This routine could optionally be reused for future weeks.

[PART 6 — HABIT INTEGRATION]

Integrate the existing Habit system into the Calendar.

Requirements:

* Display scheduled Habits on their corresponding dates.
* Show completion status where appropriate.
* Allow users to navigate from a calendar Habit to its existing Habit record.
* Avoid creating duplicate Habit records.
* Respect the existing Habit scheduling and completion logic.

Evaluate whether users should be able to manage certain Habit scheduling actions directly from the Calendar.

[PART 7 — WORKOUT INTEGRATION]

Integrate the existing Workout scheduling system.

Requirements:

* Display scheduled workouts.
* Distinguish workouts from personal events and tasks.
* Show workout completion status where available.
* Allow navigation to workout details.
* Preserve existing workout scheduling logic.
* Avoid duplicate workout records.

The Calendar should provide a unified view of personal and fitness-related activities.

[PART 8 — SMART FEATURES & PRODUCT OPPORTUNITIES]

Think critically about features that could make this Calendar genuinely valuable.

Explore opportunities such as:

* Drag-and-drop rescheduling.
* Quick event creation.
* Recurring schedules.
* Daily overview.
* Upcoming reminders.
* Weekly completion summaries.
* Overdue tasks.
* Missed activities.
* Conflict detection.
* Time allocation insights.
* Weekly planning templates.
* Calendar filtering.
* Search.
* Activity categories.
* Calendar statistics.

You do not need to implement every possible feature.

Prioritize features based on their actual usefulness, simplicity, and compatibility with the existing product.

Avoid feature bloat.

[PART 9 — UI/UX DESIGN]

The Calendar must follow the existing Royal Motion design system.

Important design requirements:

* Consistent Glassmorphism styling.
* Support for all existing themes.
* Responsive desktop and mobile layouts.
* Clean visual hierarchy.
* Beautiful event indicators.
* Smooth transitions.
* Intuitive navigation.
* Well-designed empty states.
* Clear distinction between activity types.

The Calendar should feel like a premium part of Royal Motion, not an externally embedded or disconnected component.

Pay special attention to mobile usability.

[PART 10 — DATA ARCHITECTURE]

Design a scalable and maintainable data architecture.

Requirements:

* Calendar data must be user-specific.
* Recurring activities must be modeled correctly.
* Existing Habit and Workout records should be referenced where appropriate.
* Avoid unnecessary duplication.
* Support future expansion.
* Respect existing authentication and authorization.
* Validate all user inputs.
* Ensure users cannot access another user’s private calendar data.

Carefully consider timezone handling, recurring event behavior, and date consistency.

Do not introduce unnecessary complexity into the existing database architecture.

[PART 11 — IMPLEMENTATION STRATEGY]

Before coding:

1. Analyze the existing application.
2. Identify reusable functionality.
3. Define the Calendar’s scope.
4. Design the user experience.
5. Propose the data architecture.
6. Identify required API endpoints.
7. Identify integration points with Habits and Workouts.
8. Identify potential technical challenges.

Then implement the system using the existing project architecture.

Do not rebuild existing features unnecessarily.

Do not break existing functionality.

Do not introduce unnecessary dependencies.

Do not make unrelated changes to other parts of the application.

[PART 12 — FINAL QUALITY CONTROL]

After implementation, verify:

* All calendar views work correctly.
* Events can be created, edited, and deleted.
* Recurring events behave correctly.
* Weekly planning works.
* Habit integration works.
* Workout integration works.
* User data remains isolated.
* Timezones and dates are handled correctly.
* Responsive layouts work.
* All themes render correctly.
* Existing functionality remains intact.

[FINAL EXPECTATION]

I want a comprehensive, polished, and scalable Calendar & Personal Planning System.

Do not approach this as a simple calendar implementation.

Think like a product designer building a standalone premium productivity product inside Royal Motion.

The final experience should make users want to open their Calendar every day because it genuinely helps them organize their lives, stay consistent, and understand what they need to do next.

Prioritize usefulness, simplicity, integration, and long-term scalability.
## Activity Feature

This feature allows users to log activities, meals and medications for the pet to the app so they can keep track and manage anything care-related for their pet.

For this feature there are multiple ways to manage these activities.

# Dashboard Activity Log

From here user will get a list of activities they or other co-carers have logged in the app. It will only display activities for the current day. From the dashboard, each activity will be editable by tapping on the individual activity which will slide up a modal from the bottom of the page where the user can change details of that activity. They can also log a new activity by tapping the plus icon which will sit opposite of the activity section label and only be visible if there is at least one activity logged for the day. Otherwise we will display the "Log an activity" card in the empty activity log. When adding a new activity, we should route to a new page where we gather the required information (below).

# Activity Page

The activity page will give the user much more details and list all activities logged by carers of the selected pet. At the top of the Activity page - the user can select a pet to make it active, and the activity page will update the activity log to show activity for the selected pet. It will display 3 cards that give overview of some weekly primary metrics like "Activities" "Meals" and "Treats". These will be tracked for the current week (Monday - Sunday) and give a progress indicator that compares this weeks activities with last weeks to let the user know if they are giving more treats or meals this week vs last week and same with activities. This will help guide the user for consistency with their pet.

The user will be able to filter by metric: Activities, Meals, Treats, Medications, Vet Vistis. They will also be able to sort by newest/oldest or select a specific date from a calendar menu if they need to check a specific day.

The user will also be able to add new activities or edit existing ones on this page as well. They will not be able to change the initial time that the activity was logged

## Activities the user can log

When a user wants to log an activity, the first screen they will see will be activity type. Once they select a type, they will move to activity details page where specific forms will load based on the activity type and they user can log the details for that activity and save.

Required inputs are labeled with astericks
All activities will automatically store a timestamp

# Exercise

Label*: Text input where the user can set a label "Morning walk, afternoon hike, bike ride, etc."
Exercise type*: drop down menu with Walk, Run, Dog Park, Home Playtime, Other
If the user selects other, we will present a text input for them to type a custom exercise

Duration\*: two text inputs for hours and minutes
Distance: text input for number of miles traveled
Location: text input where they can either put an address or name of an area they were at.
Notes: textfield where user can leave notes. This input will trigger a little note icon for the individual activity card on the dashboard/activity page so users will know this activity has notes from the user

# Food

Label*: Text input where the user can set a label "Morning meal, breakfast, Dinner, etc."
Type*: Toggle for Meal or Treat
Food*: drop down list of the foods and treats the user has input on the onboarding/pet add section. This should be dynamic and only show food stored as treats if the treats toggle is selected, same with meals.  
Amount*: number input with a toggle next to it for cups/ounces/pieces
Notes: textfield where user can leave notes. This input will trigger a little note icon for the individual activity card on the dashboard/activity page so users will know this activity has notes from the user

# Medication

Medication*: drop down list of the medications the user has added for the pet.
Amount*: number input with a toggle next to it for tablets/injection/etc. (should match the medication section in the add pet or onboarding section)
Notes: textfield where user can leave notes. ("given with cheese, etc.") This input will trigger a little note icon for the individual activity card on the dashboard/activity page so users will know this activity has notes from the user

# Vet Visit

Label*: text input where user can put what the vet visit was for "Checkup, hot spot, etc."
Location*: drop down list that will show their currently listed vet clinic OR 'other' where the user can manually type in where they took the pet.
Other pets?: Drop down input list with multiselect with all pets (excluding the current active pet the activity is being added for) for instances where users might bring multiple pets in for an appointment. This will automatically add the same activity for all selected pets. This field should only be available if the user has more than one pet.
Notes: user can leave notes about the visit, any diagnoses or information relavent to the visit.

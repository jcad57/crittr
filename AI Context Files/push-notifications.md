## For push notifications refer to the following documentation for proper implementation: https://docs.expo.dev/versions/latest/sdk/notifications/

# Push notification styling

The icon will use the same icon for the app logo/icon in app.json
The styling for the notification should be default to the device.

# Push notifications will be present in the following ways:

1. Reminders can be set by the user to remind them about certain activities that need to take place. These reminders can be set in the food management, medication management, vaccinations and upcoming vet visit sections of the app. They will allow the app to remind the user when it's time to feed their pets, take medications or about any upcoming scheduled vet visits and vaccinations that are due.
2. When co-caring for a pet, users will get notified by push notification (outside the app) when one of the co-carers logs an activity for a shared pet. This will help co-carers see what's going on inside the app without having to necessarily open it.
3. When changes to co-caring status occur, we will send push notifications to the other user. For example, if a co-caring removes a pet from their app we will notify the primary caretaker via push notification (and in-app notification) of the change. If a primary caretaker removes a co-carer, we will notify the co-caring via push notification (and in-app notification)
4. When no activity is logged for a day, at a certain point we will send a push notification to remind the user to log their pet's activity for the day in a friendly way. This will help encourage consistency
5. Based on the daily progress indicators, we will send push notifications if certain things like exercise activities remain un-logged. This will either remind the user to exercise their pet or to log it if they already have.
6. All notifications should act as a call to action, when a user taps on the notification it should open the app for the user and if possible route to a specific section of the app relating to the notification that was sent out.

# Permissions

Push notifications will be turned on by default however we need to ensure to collect permission during sign up. After the user successfully completes onboarding, we route to the dashboard and should prompt the user for permission to receive push notifications.

This can be turned off in the settings page, users will also be able to customize the notifications that we send out. The options will be:

1. All (select all/deselct all)
2. Reminders
3. Activities

more could be added later. These will all be toggle switches.

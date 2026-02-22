export default defineBackground(() => {
  console.log('crush background service worker loaded');

  // Future: Background sync with Chrome alarms API
  // When ready, add 'alarms' permission to manifest and uncomment:
  //
  // chrome.alarms.create('daily-brief', { periodInMinutes: 60 });
  // chrome.alarms.onAlarm.addListener(async (alarm) => {
  //   if (alarm.name === 'daily-brief') {
  //     // Read tasks from localStorage (via message passing to newtab)
  //     // Call AI to generate ComputedView
  //     // Save to storage
  //   }
  // });
});

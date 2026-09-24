import { Redirect } from 'expo-router';

// Keep the tab entry/deep link, but render the live session outside the tabs.
export default function PracticeTab() {
  return <Redirect href="/practice/active" />;
}

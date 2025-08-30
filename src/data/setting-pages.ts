import Settings from "../components/pages/settings/Settings.svelte";
import CustomTables from "../components/pages/settings/CustomTables.svelte";
import Templates from "../components/pages/settings/Templates.svelte";

export const settingPages = [
  { name: 'Settings', component: Settings },
  { name: 'Custom Tables', component: CustomTables},
  { name: 'Templates', component: Templates},
];
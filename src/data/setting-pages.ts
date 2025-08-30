import Settings from "../components/pages/settings/Settings.svelte";
import FeatureToggles from "../components/pages/settings/FeatureToggles.svelte";
import ThemeSettings from "../components/pages/settings/ThemeSettings.svelte";
import CustomTables from "../components/pages/settings/CustomTables.svelte";
import Templates from "../components/pages/settings/Templates.svelte";
import LLMSettings from "../components/pages/settings/LLMSettings.svelte";

export const settingPages = [
  { name: 'Settings', component: Settings },
  { name: 'Feature Toggles', component: FeatureToggles },
  { name: 'Theme', component: ThemeSettings },
  { name: 'Custom Tables', component: CustomTables},
  { name: 'Templates', component: Templates},
  { name: 'LLM Settings', component: LLMSettings},
];
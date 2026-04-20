import {
  ANUBIS_IMAGE_NAMES,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  isValidRedirectImageUrl,
  sanitizeSettings,
  type AnubisImageName,
} from "../lib/settings";

export default defineBackground(() => {
  const RULE_IDS: Record<AnubisImageName, number> = {
    happy: 1001,
    pensive: 1002,
    reject: 1003,
  };

  function imageRegex(name: AnubisImageName): string {
    return `^https?://[^/]+/\\.within\\.website/x/cmd/anubis/static/img/${name}\\.webp(?:\\?.*)?$`;
  }

  async function getSettings() {
    const stored = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
    return sanitizeSettings(stored[SETTINGS_STORAGE_KEY] ?? DEFAULT_SETTINGS);
  }

  function buildRules(settings: Awaited<ReturnType<typeof getSettings>>) {
    return ANUBIS_IMAGE_NAMES.flatMap((name) => {
      const redirectUrl = settings.uploadedImages[name] || settings.urls[name];

      if (!settings.disableMascot && (!redirectUrl || !isValidRedirectImageUrl(redirectUrl))) {
        return [];
      }

      return [
        {
          id: RULE_IDS[name],
          priority: 1,
          action: settings.disableMascot
            ? { type: "block" as const }
            : {
                type: "redirect" as const,
                redirect: {
                  url: redirectUrl,
                },
              },
          condition: {
            regexFilter: imageRegex(name),
            resourceTypes: ["image" as const],
          },
        },
      ];
    });
  }

  async function applyDynamicRules() {
    const settings = await getSettings();
    const addRules = buildRules(settings);

    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Object.values(RULE_IDS),
      addRules,
    });
  }

  browser.runtime.onInstalled.addListener(() => {
    void applyDynamicRules();
  });

  browser.runtime.onStartup.addListener(() => {
    void applyDynamicRules();
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[SETTINGS_STORAGE_KEY]) {
      return;
    }

    void applyDynamicRules();
  });
});

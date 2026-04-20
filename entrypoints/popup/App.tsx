import { useEffect, useMemo, useState } from "react";
import {
  ANUBIS_IMAGE_NAMES,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  isValidHttpUrl,
  isValidImageDataUrl,
  sanitizeSettings,
  type AnubisImageName,
  type MascotSettings,
} from "../../lib/settings";
import happyPreview from "../../assets/happy.webp";
import pensivePreview from "../../assets/pensive.webp";
import rejectPreview from "../../assets/reject.webp";
import extensionIcon from "../../assets/icon.png";

type FormErrors = Partial<Record<AnubisImageName, string>>;

const LABELS: Record<AnubisImageName, string> = {
  happy: "Happy",
  pensive: "Pensive",
  reject: "Reject",
};

const PREVIEWS: Record<AnubisImageName, string> = {
  happy: happyPreview,
  pensive: pensivePreview,
  reject: rejectPreview,
};

function getPreviewSource(settings: MascotSettings, name: AnubisImageName): string {
  const uploaded = settings.uploadedImages[name];
  if (uploaded && isValidImageDataUrl(uploaded)) {
    return uploaded;
  }

  return PREVIEWS[name];
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Invalid file data."));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function App() {
  const [settings, setSettings] = useState<MascotSettings>(DEFAULT_SETTINGS);
  const [savedMessage, setSavedMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [uploadErrors, setUploadErrors] = useState<FormErrors>({});

  useEffect(() => {
    let isMounted = true;

    browser.storage.local
      .get(SETTINGS_STORAGE_KEY)
      .then((stored) => {
        if (!isMounted) {
          return;
        }

        const next = sanitizeSettings(stored[SETTINGS_STORAGE_KEY] ?? DEFAULT_SETTINGS);
        setSettings(next);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setLoadError("Failed to load saved settings.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const errors = useMemo<FormErrors>(() => {
    if (settings.disableMascot) {
      return {};
    }

    const nextErrors: FormErrors = {};

    for (const name of ANUBIS_IMAGE_NAMES) {
      const uploaded = settings.uploadedImages[name];
      if (uploaded) {
        if (!isValidImageDataUrl(uploaded)) {
          nextErrors[name] = "Uploaded image data is invalid. Upload again.";
        }
        continue;
      }

      const value = settings.urls[name];
      if (!value) {
        continue;
      }

      if (!isValidHttpUrl(value)) {
        nextErrors[name] = "Use a valid http(s) URL.";
      }
    }

    return {
      ...nextErrors,
      ...uploadErrors,
    };
  }, [settings, uploadErrors]);

  const hasErrors = Object.values(errors).some(Boolean);

  async function persistSettings(nextSettings: MascotSettings, message = "Saved. Refresh Anubis pages to see updates.") {
    await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: nextSettings });
    setSavedMessage(message);
  }

  async function updateUrl(name: AnubisImageName, value: string, autoSave = false) {
    setSavedMessage("");
    const nextSettings: MascotSettings = {
      ...settings,
      urls: {
        ...settings.urls,
        [name]: value,
      },
    };

    setUploadErrors((current) => ({ ...current, [name]: undefined }));
    setSettings(nextSettings);

    if (autoSave) {
      await persistSettings(nextSettings, "Saved.");
    }
  }

  async function toggleDisableMascot(disableMascot: boolean) {
    setSavedMessage("");
    const nextSettings: MascotSettings = {
      ...settings,
      disableMascot,
    };
    setSettings(nextSettings);
    await persistSettings(nextSettings, "Saved.");
  }

  async function uploadImage(name: AnubisImageName, file: File | undefined) {
    if (!file) {
      return;
    }

    setSavedMessage("");

    if (!file.type.startsWith("image/")) {
      setUploadErrors((current) => ({
        ...current,
        [name]: "Upload an image file.",
      }));
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const nextSettings: MascotSettings = {
        ...settings,
        uploadedImages: {
          ...settings.uploadedImages,
          [name]: dataUrl,
        },
      };

      setUploadErrors((current) => ({ ...current, [name]: undefined }));
      setSettings(nextSettings);
      await persistSettings(nextSettings, "Saved.");
    } catch {
      setUploadErrors((current) => ({
        ...current,
        [name]: "Failed to read the selected file.",
      }));
    }
  }

  async function clearUploadedImage(name: AnubisImageName) {
    setSavedMessage("");
    const nextSettings: MascotSettings = {
      ...settings,
      uploadedImages: {
        ...settings.uploadedImages,
        [name]: "",
      },
    };

    setUploadErrors((current) => ({ ...current, [name]: undefined }));
    setSettings(nextSettings);
    void persistSettings(nextSettings, "Saved.");
  }

  async function saveSettings() {
    if (hasErrors) {
      return;
    }

    await persistSettings(settings);
  }

  async function clearAllSettings() {
    setSettings(DEFAULT_SETTINGS);
    setUploadErrors({});
    await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS });
    setSavedMessage("Cleared all settings.");
  }

  return (
    <main className="popup">
      <h1 className="title-row">
        <img className="title-icon" src={extensionIcon} alt="Extension icon" />
        <span>Anubis Mascot Replacer</span>
      </h1>
      <p className="subtitle">Set hosted URLs or upload custom files for each mascot image.</p>

      <label className="toggle-row" htmlFor="disableMascot">
        <input
          id="disableMascot"
          type="checkbox"
          checked={settings.disableMascot}
          onChange={(event) => {
            void toggleDisableMascot(event.target.checked);
          }}
        />
        Disable mascot completely
      </label>

      <section className={settings.disableMascot ? "form-section is-disabled" : "form-section"}>
        <small className="hint">URL is used only when no upload is set.</small>
        {ANUBIS_IMAGE_NAMES.map((name) => (
          <label key={name} className="field" htmlFor={`url-${name}`}>
            <span className="field-title-row">
              <span>{LABELS[name]}</span>
              <img
                className="preview"
                src={getPreviewSource(settings, name)}
                alt={`${LABELS[name]} mascot preview`}
              />
            </span>
            <div className="upload-row">
              <input
                id={`file-${name}`}
                type="file"
                accept="image/*"
                disabled={settings.disableMascot}
                onChange={(event) => {
                  void uploadImage(name, event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                className="clear-upload"
                disabled={settings.disableMascot || !settings.uploadedImages[name]}
                onClick={() => {
                  void clearUploadedImage(name);
                }}
              >
                Clear upload
              </button>
            </div>
            {settings.uploadedImages[name] ? (
              <small className="status">Using uploaded image for {LABELS[name]}</small>
            ) : null}
            <input
              id={`url-${name}`}
              type="url"
              inputMode="url"
              placeholder={`https://example.com/${name}.webp`}
              value={settings.urls[name]}
              disabled={settings.disableMascot}
              onChange={(event) => {
                void updateUrl(name, event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();
                void updateUrl(name, event.currentTarget.value, true);
              }}
              onPaste={(event) => {
                event.preventDefault();
                const pastedValue = event.clipboardData.getData("text");
                void updateUrl(name, pastedValue, true);
              }}
            />
            {errors[name] ? <small className="error">{errors[name]}</small> : null}
          </label>
        ))}
      </section>

      <button type="button" onClick={() => void saveSettings()} disabled={hasErrors}>
        Save
      </button>
      <button type="button" className="secondary-button" onClick={() => void clearAllSettings()}>
        Clear all
      </button>

      {savedMessage ? <p className="status">{savedMessage}</p> : null}
      {loadError ? <p className="error">{loadError}</p> : null}

      <p className="github-link-wrap">
        <a
          className="github-link"
          href="https://github.com/imjac0b/anubis-mascot-replacer"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </p>
    </main>
  );
}

export default App;

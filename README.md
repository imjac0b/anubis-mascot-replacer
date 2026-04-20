# Anubis Mascot Replacer

Browser extension for replacing the Anubis mascot images with custom images.

## What it does

- Replaces the `happy`, `pensive`, and `reject` mascot images used by Anubis.
- Lets you point each mascot to a hosted image URL.
- Lets you upload a local image for each mascot.
- Can also disable the mascot entirely.

## Development

```bash
bun install
bun run dev
```

To build for production:

```bash
bun run build
```

Firefox builds are also available:

```bash
bun run dev:firefox
bun run build:firefox
```

## Usage

1. Run the extension and open the popup.
2. Set a hosted image URL or upload an image for each mascot.
3. Save the settings.
4. Refresh any open Anubis pages to see the updated mascot.

## Credits

The mascot images are from the Anubis project and were made by CELPHASE: https://bsky.app/profile/celphase.bsky.social


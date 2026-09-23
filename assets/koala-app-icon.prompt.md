# Mobile app icon

Source logo: `koala-driving-logo-v5.png` (approved version without a windshield).

- `koala-app-icon.png`: 1024 × 1024 opaque PNG for iOS and legacy Android; white background.
- `koala-adaptive-icon.png`: 1024 × 1024 transparent PNG exported from the approved source at 920 × 920, centered with 52 pixels of additional transparent padding. The artwork fits inside Android's central 66/108 safe circle. Used over a white background in `app.json`.

The white-backed icon was prepared with built-in image_gen and exported to 1024 × 1024 with macOS sips. The Android foreground was resized and padded with Expo's installed jimp-compact dependency, preserving the original artwork and transparency.

## Image generation prompt

Use case: precise-object-edit.
Asset type: iOS mobile app icon PNG.
Prepare the exact attached approved koala-in-car logo as a square app icon. Change only the background and overall placement/scale for app-icon packaging: place the entire existing logo centered on a solid pure white #FFFFFF opaque square, with the mascot occupying about 78% of the square's width and balanced padding. Output 1024 by 1024 pixels if possible. The white background must reach all four edges, including corners; no rounded canvas corners.
Preserve the logo's exact design and internal proportions: large grey neutral mouthless koala head, small ears, tiny black eyes, black oval nose, short light-blue rounded car, two black circular wheels with white centers. Keep the relative head-to-car size unchanged. There is NO WINDSHIELD, NO BODY, NO ARMS OR PAWS. Do not add any features or change the illustration. Keep colors, outlines and flat style identical to the source. No text, gradients, shadows, glow, mockup, scenery, border, or extra elements.
Make the PNG entirely opaque with no transparent pixels. This is one icon asset, not a device mockup.

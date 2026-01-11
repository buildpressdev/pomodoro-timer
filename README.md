# React Chrome Extension

A modern Chrome extension built with React 18 and Manifest V3, featuring a popup interface with state management using Chrome storage API.

## Features

- ✅ **React 18** with modern hooks
- ✅ **Manifest V3** compliant (latest Chrome extension standards)
- ✅ **Webpack 5** for bundling and hot reloading
- ✅ **Chrome Storage API** for state persistence
- ✅ **TypeScript-ready** configuration
- ✅ **ESLint & Prettier** for code quality
- ✅ **Responsive popup UI** with styled components

## Project Structure

```
chrome-extension/
├── public/
│   ├── manifest.json           # Extension configuration
│   └── icons/                  # Extension icons
├── src/
│   ├── components/
│   │   └── Popup/              # React popup component
│   │       ├── Popup.jsx
│   │       └── Popup.css
│   ├── popup.html              # Entry HTML for popup
│   ├── popup.js               # React entry point
│   └── index.js               # Background service worker
├── webpack.config.js          # Build configuration
├── package.json               # Dependencies and scripts
└── .babelrc                   # Babel configuration
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Chrome browser

### Installation

1. **Clone or setup the project:**
   ```bash
   # If starting fresh, you already have the files
   # Otherwise, clone this repository
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   # Development build (with watch mode)
   npm run dev
   
   # Or production build
   npm run build
   ```

### Loading the Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `dist` folder from your project directory
6. The extension should now appear in your toolbar!

## Development

### Available Scripts

- `npm run dev` - Build in development mode with file watching
- `npm run build` - Build for production
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier

### Development Workflow

1. Make changes to your React components
2. Webpack will automatically rebuild the `dist` folder
3. In Chrome Extensions page, click the **Reload** button for your extension
4. Test your changes by clicking the extension icon

### Chrome APIs Used

- **Storage API**: For persisting extension state
- **Runtime API**: For extension lifecycle events
- **Action API**: For popup interactions

## Customization

### Modifying the Popup

Edit `src/components/Popup/Popup.jsx` to customize the popup UI and functionality.

### Adding Chrome APIs

Add permissions to `public/manifest.json`:

```json
{
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ]
}
```

Then use the APIs in your components:

```javascript
// Example: Get current tab info
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  console.log('Current tab:', tabs[0]);
});
```

### Icons

Replace the placeholder icons in `public/icons/` with your actual icons:
- `icon-16.png` (16x16px) - Toolbar icon
- `icon-32.png` (32x32px) - Windows toolbar
- `icon-48.png` (48x48px) - Extensions page
- `icon-128.png` (128x128px) - Chrome Web Store

## Building for Production

1. Build the extension:
   ```bash
   npm run build
   ```

2. The `dist` folder contains the packaged extension

3. **Important**: The `dist` folder is what you'll upload to the Chrome Web Store

## Chrome Web Store Publication

1. Create a developer account on Chrome Web Store
2. Prepare your extension listing (screenshots, description, etc.)
3. Upload the `dist` folder as a ZIP file
4. Submit for review

## Troubleshooting

### Extension doesn't load
- Check the Chrome Extensions page for errors
- Ensure `manifest.json` is valid JSON
- Verify all file paths in manifest are correct

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check that Node.js version is 16+

### React hot reload not working
- Manually reload the extension in `chrome://extensions/`
- Ensure the `dist` folder is being updated by webpack

## Technologies Used

- **React 18** - UI framework
- **Webpack 5** - Module bundler
- **Babel** - JavaScript transpiler
- **Manifest V3** - Chrome extension format
- **Chrome Extension APIs** - Browser integration

## License

MIT License

## Support

For issues and questions:
1. Check Chrome Extension documentation
2. Review the Chrome Extensions API reference
3. Debug using Chrome DevTools (right-click popup → Inspect)
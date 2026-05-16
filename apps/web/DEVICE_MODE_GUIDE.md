# Device Mode System Guide

## Overview

This app implements a centralized device mode system that provides three distinct modes: **Desktop**, **Tablet**, and **Mobile**. The system uses React Context and custom hooks to manage device-specific configurations and UI behavior.

## Device Modes

### Mobile Mode (0-768px)
- **Mobile Footer**: Visible with navigation buttons
- **Floating Contacts**: Hidden
- **Floating Cart**: Hidden (cart is in footer)
- **Navbar Buttons**: Hidden (moved to footer)
- **Search Elements**: Clean search field only
- **Menu Items**: Max 3 per row, small size

### Tablet Mode (769-1024px)
- **Mobile Footer**: Hidden
- **Floating Contacts**: Visible
- **Floating Cart**: Visible
- **Navbar Buttons**: Language and theme toggles visible
- **Search Elements**: Full search with icon and clear button
- **Menu Items**: Max 4 per row, medium size

### Desktop Mode (1025px+)
- **Mobile Footer**: Hidden
- **Floating Contacts**: Visible
- **Floating Cart**: Visible
- **Navbar Buttons**: All buttons visible including account
- **Search Elements**: Full search with icon and clear button
- **Menu Items**: Max 5 per row, large size

## Architecture

### Core Files

1. **`src/contexts/DeviceContext.jsx`**
   - Main context provider
   - Device mode detection logic
   - Configuration management

2. **`src/hooks/useDeviceMode.js`**
   - Custom hook for easy access
   - Helper functions and configurations
   - Clean API for components

### Usage

```jsx
import { useDeviceMode } from '../hooks/useDeviceMode';

function MyComponent() {
  const device = useDeviceMode();
  
  // Check device mode
  if (device.isMobile) {
    // Mobile-specific logic
  }
  
  // Use configurations
  if (device.shouldShowMobileFooter) {
    return <MobileFooter />;
  }
  
  // Access constants
  console.log(device.DEVICE_MODES.DESKTOP);
}
```

## Configuration

### Device Configurations

Each device mode has a configuration object that controls:

- **UI Visibility**: Which components to show/hide
- **Layout Settings**: Container padding, search field width
- **Menu Settings**: Items per row, item sizes
- **Behavior**: Device-specific interactions

### Breakpoints

```javascript
export const BREAKPOINTS = {
  MOBILE_MAX: 768,    // 0-768px: Mobile
  TABLET_MAX: 1024,   // 769-1024px: Tablet
  // 1025px+: Desktop
};
```

## Best Practices

### 1. Use the Hook
Always use `useDeviceMode()` instead of direct media queries:

```jsx
// ✅ Good
const device = useDeviceMode();
if (device.shouldShowMobileFooter) { ... }

// ❌ Bad
const isMobile = useMediaQuery('(max-width:768px)');
if (isMobile) { ... }
```

### 2. Configuration-Driven
Use device configurations instead of hardcoded conditions:

```jsx
// ✅ Good
{device.shouldShowSearchIcon && <SearchIcon />}

// ❌ Bad
{!isMobile && <SearchIcon />}
```

### 3. Responsive Design
Use device-specific configurations for responsive layouts:

```jsx
<Box sx={{
  padding: device.containerPadding,
  maxWidth: device.searchFieldWidth
}}>
```

## Component Integration

### Navbar
- Uses device configurations for button visibility
- Responsive search field behavior
- Account button only on desktop

### MobileFooter
- Only visible in mobile mode
- Contains all mobile navigation

### FloatingContacts
- Hidden in mobile mode
- Positioned based on device type

### FloatingCart
- Hidden in mobile mode (cart is in footer)
- Visible in tablet and desktop

### ProfileMenu
- Responsive menu item layout
- Device-specific container sizing

## Testing

### Manual Testing
1. **Mobile (0-768px)**: Check mobile footer, hidden floating elements
2. **Tablet (769-1024px)**: Check floating elements, navbar buttons
3. **Desktop (1025px+)**: Check all elements, account button

### Browser DevTools
- Use responsive design mode
- Test at breakpoint boundaries
- Verify smooth transitions

## Future Enhancements

1. **Touch Detection**: Add touch device detection
2. **Orientation Support**: Handle device orientation changes
3. **Performance**: Add lazy loading for device-specific components
4. **Accessibility**: Enhanced accessibility for different devices

## Migration Guide

### From Old System
1. Replace `useMediaQuery` with `useDeviceMode`
2. Replace hardcoded conditions with device configurations
3. Update component visibility logic
4. Test all three device modes

### Example Migration
```jsx
// Before
const isMobile = useMediaQuery('(max-width:768px)');
const isTablet = useMediaQuery('(min-width:769px) and (max-width:1024px)');

// After
const device = useDeviceMode();
// Use device.isMobile, device.isTablet, device.config, etc.
```

This system provides a clean, maintainable, and scalable approach to responsive design with centralized device logic.

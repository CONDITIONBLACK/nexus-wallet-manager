# Nexus Wallet Manager - Design System & Brand Guidelines

## 🎨 Visual Identity

### Color Palette

#### Primary Colors
- **Nexus Black**: `#0A0A0A` - Primary background
- **Nexus Accent**: `#00FF88` - Primary accent (mint green)
- **Nexus Glass**: `rgba(255, 255, 255, 0.05)` - Glass morphism base
- **Nexus Border**: `rgba(255, 255, 255, 0.08)` - Subtle borders

#### Secondary Colors
- **Success Green**: `#00FF88`
- **Error Red**: `#FF3366`
- **Warning Yellow**: `#FFB800`
- **Info Blue**: `#00B4D8`
- **Purple Accent**: `#9B5DE5`

#### Text Colors
- **Primary Text**: `rgba(255, 255, 255, 1)` - Headers and important text
- **Secondary Text**: `rgba(255, 255, 255, 0.7)` - Body text
- **Muted Text**: `rgba(255, 255, 255, 0.5)` - Captions and hints
- **Disabled Text**: `rgba(255, 255, 255, 0.3)` - Disabled states

### Typography

#### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

#### Font Weights
- **Light**: 300 - Decorative text
- **Regular**: 400 - Body text
- **Medium**: 500 - Buttons and labels
- **Bold**: 700 - Headers

#### Font Sizes
- **Display**: 48px - Hero text
- **Heading 1**: 32px - Page titles
- **Heading 2**: 24px - Section titles
- **Heading 3**: 20px - Card titles
- **Body**: 14px - Default text
- **Small**: 12px - Captions
- **Tiny**: 10px - Micro text

### Spacing System
Based on 4px grid system:
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-5`: 20px
- `space-6`: 24px
- `space-8`: 32px
- `space-10`: 40px
- `space-12`: 48px

## 🪟 Glass Morphism Design

### Glass Panel Component
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}
```

### Glass Effects Hierarchy
1. **Primary Glass**: 5% white opacity, 20px blur
2. **Secondary Glass**: 3% white opacity, 10px blur
3. **Tertiary Glass**: 2% white opacity, 5px blur
4. **Hover State**: +2% white opacity
5. **Active State**: +3% white opacity

## ✨ Motion & Animation

### Animation Principles
- **Duration**: 200-400ms for micro-interactions
- **Easing**: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Material standard)
- **Stagger**: 50ms delay between list items
- **Spring**: Tension 120, Friction 14 for bouncy animations

### Standard Animations
```javascript
// Fade In
initial: { opacity: 0 }
animate: { opacity: 1 }
transition: { duration: 0.3 }

// Slide Up
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.3 }

// Scale Pop
initial: { opacity: 0, scale: 0.9 }
animate: { opacity: 1, scale: 1 }
transition: { duration: 0.2 }
```

## 🎭 Component Library

### Buttons

#### Primary Button
- Background: Nexus Accent with 20% opacity
- Border: Nexus Accent with 50% opacity
- Text: Nexus Accent
- Hover: +10% opacity on background
- Active: Scale 0.98

#### Secondary Button
- Background: Glass effect
- Border: White with 8% opacity
- Text: White with 70% opacity
- Hover: Background white 5% opacity

#### Icon Button
- Size: 40x40px
- Background: Glass effect
- Icon: 20x20px
- Hover: Rotate icon 15deg

### Cards

#### Standard Card
- Background: Glass panel effect
- Padding: 24px
- Border radius: 16px
- Shadow: Subtle drop shadow

#### Hover Card
- Transform: translateY(-2px)
- Shadow: Enhanced on hover
- Border: Slight accent glow

### Form Elements

#### Input Field
- Background: Black with 30% opacity
- Border: White with 10% opacity
- Focus: Nexus Accent border
- Height: 48px
- Padding: 0 16px

#### Textarea
- Min height: 100px
- Resizable: Vertical only
- Same styling as input

#### Select/Dropdown
- Custom styled with glass effect
- Animated chevron
- Dropdown with glass panel

### Navigation

#### Tab Navigation
- Active: Nexus Accent underline
- Inactive: White 50% opacity
- Transition: Smooth slide animation

#### Sidebar
- Width: 280px collapsed, 320px expanded
- Glass background
- Icon + text navigation items

## 🌟 Special Effects

### Particle System
- Floating particles in background
- Size: 2-4px
- Opacity: 10-30%
- Movement: Gentle drift upward
- Count: 50-100 particles

### Gradient Mesh Background
- Animated gradient orbs
- Blur: 100px
- Colors: Accent colors at 10% opacity
- Animation: Slow rotation and scale

### Mouse Follow Effect
- Subtle glow following cursor
- Radius: 400px
- Opacity: 5%
- Lag: 100ms for smooth trailing

### Glassmorphic Overlays
- Modal backgrounds: Black 50% opacity
- Blur: 10px
- Click outside to close
- Fade in/out animation

## 📱 Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: 1024px - 1440px
- Wide: > 1440px

### Mobile Adaptations
- Full-width cards
- Stacked layouts
- Bottom sheet modals
- Simplified navigation
- Touch-optimized buttons (min 44px)

## 🎯 Interaction States

### Hover States
- Buttons: Brightness +10%
- Cards: Elevation increase
- Links: Underline animation
- Icons: Rotation or scale

### Active States
- Buttons: Scale 0.98
- Inputs: Accent border
- Cards: Inset shadow
- Toggles: Smooth transition

### Loading States
- Skeleton screens with shimmer
- Spinner: Accent color
- Progress bars: Gradient animation
- Pulse animation for placeholders

### Error States
- Red accent color
- Shake animation
- Icon: Error circle
- Toast notification

## 🔒 Security UI

### Biometric Prompts
- Face ID: Animated face icon
- Touch ID: Fingerprint animation
- PIN: Secure dots input
- Pattern: Connecting dots

### Security Indicators
- Lock icon for encrypted
- Shield for protected
- Check for verified
- Warning for risks

## 🎮 Advanced Features

### Contextual Menus
- Right-click support
- Radial menus for actions
- Command palette (Cmd+K)
- Quick actions toolbar

### Data Visualization
- Charts: Glass effect bars/lines
- Gradients for positive/negative
- Animated transitions
- Hover tooltips with glass effect

### Notifications
- Toast: Top-right corner
- Banner: Top full-width
- Badge: Red dot on icons
- Sound: Subtle chime option

## 🚀 Performance Guidelines

### Optimization Rules
1. Lazy load heavy components
2. Virtualize long lists
3. Debounce search inputs (300ms)
4. Throttle scroll events (16ms)
5. Memoize expensive calculations
6. Code-split by route

### Animation Performance
- Use CSS transforms over position
- GPU acceleration for animations
- Will-change for animated elements
- RequestAnimationFrame for JS animations
- Reduce motion for accessibility

## ♿ Accessibility

### WCAG 2.1 AA Compliance
- Color contrast: 4.5:1 minimum
- Focus indicators: Visible outlines
- Keyboard navigation: Full support
- Screen readers: ARIA labels
- Reduced motion: Respect OS preference

### Keyboard Shortcuts
- `Cmd/Ctrl + K`: Command palette
- `Cmd/Ctrl + /`: Search
- `Esc`: Close modals
- `Tab`: Navigate forward
- `Shift + Tab`: Navigate backward
- `Enter`: Activate buttons
- `Space`: Toggle checkboxes

## 🎨 Brand Voice

### Personality Traits
- **Modern**: Cutting-edge technology
- **Secure**: Bank-grade security
- **Elegant**: Refined and sophisticated
- **Intuitive**: Easy to understand
- **Professional**: Serious about crypto

### Tone Guidelines
- Clear and concise
- Technical but approachable
- Confident without arrogance
- Helpful and supportive
- Security-focused messaging

## 📐 Layout Principles

### Grid System
- 12-column grid
- 24px gutters
- Max width: 1440px
- Centered container
- Fluid on mobile

### Component Spacing
- Cards: 24px gap
- Sections: 48px gap
- Inline elements: 12px gap
- Button groups: 8px gap

### Visual Hierarchy
1. Primary action: Accent color
2. Secondary action: Glass button
3. Tertiary action: Text link
4. Disabled: 30% opacity

## 🔄 Version Control

### Design Tokens
All design values should be stored as CSS variables for easy theming:

```css
:root {
  --nexus-black: #0A0A0A;
  --nexus-accent: #00FF88;
  --nexus-glass: rgba(255, 255, 255, 0.05);
  --nexus-border: rgba(255, 255, 255, 0.08);
  --nexus-text-primary: rgba(255, 255, 255, 1);
  --nexus-text-secondary: rgba(255, 255, 255, 0.7);
  --nexus-text-muted: rgba(255, 255, 255, 0.5);
  --nexus-radius-sm: 8px;
  --nexus-radius-md: 12px;
  --nexus-radius-lg: 16px;
  --nexus-radius-xl: 24px;
}
```

## 🏁 Implementation Checklist

- [ ] All colors use design tokens
- [ ] Components follow glass morphism
- [ ] Animations use standard timing
- [ ] Mobile responsive tested
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Performance optimized
- [ ] Security UI implemented
- [ ] Brand voice consistent
- [ ] Documentation complete
# Global Avenue - Warm Color Palette System

## Color Palette

### Primary Colors
- **Sunset Orange**: `#FD7E14` - Headers, Icons, Secondary Buttons
- **Crimson Red**: `#D32F2F` - Primary CTAs, Urgent Actions
- **Golden Yellow**: `#FFC107` - Badges, Highlights, Hover States

### Supporting Colors
- **White**: `#FFFFFF` - Main backgrounds
- **Warm Cream**: `#FFFCF5` - Alternative background, cards
- **Dark Charcoal**: `#333333` - Body text, headings
- **Burnt Orange**: `#C94D1B` - Footer background

### Text Colors
- Primary Text: `#333333`
- Secondary Text: `#666666`
- Muted Text: `#999999`

## Shadow System (Warm-toned)
- Light: `shadow-[0_2px_8px_rgba(253,126,20,0.1)]`
- Medium: `shadow-[0_4px_16px_rgba(253,126,20,0.2)]`
- Heavy: `shadow-[0_8px_32px_rgba(253,126,20,0.3)]`

## Component Color Applications

### Headers & Titles
- Color: `#FD7E14` (Sunset Orange)
- Text: `#333333` (Dark Charcoal)

### Buttons
- **Primary CTA**: Gradient from `#D32F2F` to `#C2185B`
- **Secondary**: Border `#FD7E14`, Text `#FD7E14`
- **Hover**: Add warm shadow

### Cards
- Background: `#FFFFFF` or `#FFFCF5`
- Border: `border-[#FD7E14]/20`
- Top border accent: `border-t-4 border-[#FD7E14]`

### Badges
- Background: `#FFC107`
- Text: `#333333`
- Glow: `shadow-[0_0_20px_rgba(255,193,7,0.4)]`

### Icons
- Primary: `#FD7E14`
- Secondary: `#FFC107`  
- Success: `#4CAF50` (green - keep for validation)
- Error: `#D32F2F`

## Migration Guide

### Old → New
- `#001F3F` → `#333333` (text)
- `#0074D9` → `#FD7E14` (primary)
- Blue gradients → Orange/Red gradients
- `#F8FAFC` → `#FFFCF5` (backgrounds)
- Blue shadows → Orange shadows

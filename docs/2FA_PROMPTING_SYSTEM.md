# Two-Factor Authentication Prompting System

A comprehensive system for encouraging and enforcing two-factor authentication enrollment with configurable prompts, reminders, and enforcement policies.

## 🎯 Overview

The 2FA prompting system balances security requirements with user experience by providing:

- **Initial Prompts**: Clear, dismissible invitations to set up 2FA
- **Reminder Prompts**: Periodic, non-blocking reminders
- **Enforcement Options**: Configurable mandatory 2FA requirements
- **Contextual Enforcement**: 2FA requirements for specific sensitive actions
- **Flexible Configuration**: Adjustable timing, frequency, and behavior

## 🏗️ Architecture

### Core Components

1. **`TwoFactorPrompt`** - Main prompting component with multiple variants
2. **`useTwoFactorPrompt`** - Custom hook for managing prompt state
3. **`TwoFactorGate`** - Higher-order component for gating sensitive actions
4. **`TwoFactorPromptConfig`** - Administrative configuration interface

### Prompt Variants

| Variant | Use Case | Behavior | Dismissible |
|---------|----------|----------|-------------|
| **Banner** | General reminders | Top of page, subtle | ✅ Yes |
| **Modal** | Enforcement, sensitive actions | Full-screen overlay | ❌ No |
| **Inline** | Contextual placement | Within content flow | ✅ Yes |

## 🚀 Quick Start

### Basic Banner Prompt

```tsx
import TwoFactorPrompt from "@/components/TwoFactorPrompt";

function MyPage() {
  return (
    <div>
      <TwoFactorPrompt 
        variant="banner"
        enforceAfter={7}
        showReminders={true}
        reminderInterval={24}
      />
      {/* Your page content */}
    </div>
  );
}
```

### Sensitive Action Gate

```tsx
import TwoFactorGate from "@/components/TwoFactorGate";

function SensitiveComponent() {
  return (
    <TwoFactorGate action="account deletion">
      <div>This content requires 2FA to view</div>
    </TwoFactorGate>
  );
}
```

### Using the Hook

```tsx
import { useTwoFactorPrompt } from "@/hooks/useTwoFactorPrompt";

function MyComponent() {
  const { isVisible, isEnforced, has2FA, dismissReminder } = useTwoFactorPrompt({
    enforceAfterDays: 7,
    showReminders: true,
    reminderIntervalHours: 24,
  });

  if (isVisible) {
    return <TwoFactorPrompt variant="banner" />;
  }

  return <div>Your content here</div>;
}
```

## ⚙️ Configuration

### Prompt Configuration

```tsx
interface TwoFactorPromptProps {
  variant?: "banner" | "modal" | "inline";
  enforceAfter?: number;        // Days until enforcement
  showReminders?: boolean;      // Show periodic reminders
  reminderInterval?: number;     // Hours between reminders
  sensitiveAction?: boolean;     // Block until 2FA is set up
  onDismiss?: () => void;       // Callback when dismissed
  onEnroll?: () => void;        // Callback when enrolling
}
```

### Hook Configuration

```tsx
interface TwoFactorPromptConfig {
  enforceAfterDays: number;     // Days until enforcement
  showReminders: boolean;       // Show periodic reminders
  reminderIntervalHours: number; // Hours between reminders
  gracePeriodDays: number;      // Grace period length
}
```

### Default Values

```tsx
const defaultConfig = {
  enforceAfterDays: 7,          // 7 days grace period
  showReminders: true,          // Show reminders
  reminderIntervalHours: 24,    // Every 24 hours
  gracePeriodDays: 7,           // 7 days grace period
};
```

## 🔄 User Experience Flow

### 1. Initial Login
- User signs in for the first time
- Banner prompt appears with "Set Up 2FA" button
- User can dismiss or set up 2FA

### 2. Reminder Phase
- If dismissed, reminders appear every 24 hours (configurable)
- Reminders are non-blocking and can be dismissed
- User continues using the application normally

### 3. Enforcement Phase
- After grace period ends, 2FA becomes mandatory
- Modal prompt appears and cannot be dismissed
- User must set up 2FA to continue

### 4. Sensitive Actions
- Certain actions require 2FA regardless of grace period
- `TwoFactorGate` component blocks access until 2FA is set up
- Provides clear explanation of why 2FA is required

## 🎨 Customization

### Styling

The components use Tailwind CSS classes and can be customized:

```tsx
// Custom banner styling
<TwoFactorPrompt
  variant="banner"
  className="bg-red-50 border-red-200"
/>
```

### Content Customization

```tsx
// Custom callbacks
<TwoFactorPrompt
  onDismiss={() => console.log("User dismissed 2FA prompt")}
  onEnroll={() => router.push("/custom-2fa-setup")}
/>
```

### Localization

```tsx
// Custom messages (in a real implementation)
const messages = {
  title: "Secure Your Account",
  description: "Enable two-factor authentication for enhanced security",
  setupButton: "Enable 2FA",
  laterButton: "Remind me later",
};
```

## 🔒 Security Considerations

### Grace Periods
- Users have time to set up 2FA without being blocked
- Configurable length based on organization policy
- Can be set to 0 for immediate enforcement

### Sensitive Actions
- Critical operations require 2FA regardless of grace period
- Examples: account deletion, password changes, admin actions
- Use `TwoFactorGate` component for these scenarios

### Dismissal Tracking
- Reminders respect dismissal preferences
- Users can't permanently dismiss enforcement prompts
- Dismissal state resets after reminder interval

## 📱 Responsive Design

All prompt variants are mobile-responsive:

- **Banner**: Adapts to mobile screen sizes
- **Modal**: Full-screen on mobile devices
- **Inline**: Responsive grid layout
- **Touch-friendly**: Large touch targets for mobile

## 🧪 Testing

### Demo Page

Visit `/admin/2fa-prompting` to test different scenarios:

- Interactive demo of all variants
- Configuration testing
- Responsive design testing
- State management testing

### Testing Scenarios

1. **New User**: First login without 2FA
2. **Reminder User**: Dismissed initial prompt, seeing reminders
3. **Enforced User**: Grace period expired, mandatory 2FA
4. **Sensitive Action**: Trying to access protected content
5. **2FA User**: Already has 2FA set up (no prompts)

## 🔧 Integration Examples

### Header Integration

```tsx
// apps/web/components/Header.tsx
import TwoFactorPrompt from "./TwoFactorPrompt";

export default function Header() {
  return (
    <header>
      <TwoFactorPrompt variant="banner" />
      {/* Rest of header content */}
    </header>
  );
}
```

### Dashboard Integration

```tsx
// apps/web/app/dashboard/page.tsx
import TwoFactorPrompt from "@/components/TwoFactorPrompt";

export default function Dashboard() {
  return (
    <div>
      <TwoFactorPrompt variant="inline" />
      <h1>Dashboard</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

### Settings Page Integration

```tsx
// apps/web/app/settings/page.tsx
import TwoFactorGate from "@/components/TwoFactorGate";

export default function Settings() {
  return (
    <div>
      <h1>Account Settings</h1>
      
      <TwoFactorGate action="password changes">
        <PasswordChangeForm />
      </TwoFactorGate>
      
      <TwoFactorGate action="account deletion">
        <DeleteAccountForm />
      </TwoFactorGate>
    </div>
  );
}
```

## 🚀 Advanced Usage

### Custom Prompt Logic

```tsx
function CustomPromptLogic() {
  const { isVisible, has2FA } = useTwoFactorPrompt({
    enforceAfterDays: 0, // Immediate enforcement
    showReminders: false,
  });

  // Custom logic based on user role
  if (isVisible && userRole === 'admin') {
    return <AdminTwoFactorPrompt />;
  }

  if (isVisible) {
    return <StandardTwoFactorPrompt />;
  }

  return null;
}
```

### Conditional Enforcement

```tsx
function ConditionalEnforcement() {
  const { isVisible } = useTwoFactorPrompt({
    enforceAfterDays: userRiskLevel === 'high' ? 0 : 7,
    showReminders: userRiskLevel !== 'high',
  });

  return isVisible ? <TwoFactorPrompt /> : null;
}
```

### Analytics Integration

```tsx
function AnalyticsPrompt() {
  const handleDismiss = () => {
    analytics.track('2fa_prompt_dismissed', {
      variant: 'banner',
      userType: 'new_user',
    });
  };

  const handleEnroll = () => {
    analytics.track('2fa_prompt_enroll_clicked', {
      variant: 'banner',
      userType: 'new_user',
    });
  };

  return (
    <TwoFactorPrompt
      onDismiss={handleDismiss}
      onEnroll={handleEnroll}
    />
  );
}
```

## 📊 Performance Considerations

### Lazy Loading

```tsx
// Only load 2FA components when needed
const TwoFactorPrompt = lazy(() => import('./TwoFactorPrompt'));

function MyPage() {
  const [showPrompt, setShowPrompt] = useState(false);
  
  useEffect(() => {
    // Check 2FA status and show prompt if needed
    check2FAStatus().then(needs2FA => setShowPrompt(needs2FA));
  }, []);

  return showPrompt ? <TwoFactorPrompt /> : null;
}
```

### Memoization

```tsx
const MemoizedPrompt = memo(TwoFactorPrompt);

function MyComponent() {
  const config = useMemo(() => ({
    enforceAfterDays: 7,
    showReminders: true,
    reminderIntervalHours: 24,
  }), []);

  return <MemoizedPrompt {...config} />;
}
```

## 🔮 Future Enhancements

### Planned Features

1. **A/B Testing**: Test different prompt messages and timing
2. **Smart Timing**: Show prompts at optimal times based on user behavior
3. **Progressive Disclosure**: Gradually increase urgency over time
4. **Integration Hooks**: Webhook notifications for 2FA events
5. **Analytics Dashboard**: Track 2FA adoption rates and effectiveness

### Extension Points

The system is designed to be extensible:

- Custom prompt variants
- Advanced dismissal logic
- Integration with external systems
- Custom enforcement rules
- Multi-language support

## 📚 API Reference

### TwoFactorPrompt Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"banner" \| "modal" \| "inline"` | `"banner"` | Visual style of the prompt |
| `enforceAfter` | `number` | `7` | Days until enforcement |
| `showReminders` | `boolean` | `true` | Show periodic reminders |
| `reminderInterval` | `number` | `24` | Hours between reminders |
| `sensitiveAction` | `boolean` | `false` | Block until 2FA is set up |
| `onDismiss` | `() => void` | `undefined` | Dismiss callback |
| `onEnroll` | `() => void` | `undefined` | Enroll callback |

### useTwoFactorPrompt Return

| Property | Type | Description |
|----------|------|-------------|
| `isVisible` | `boolean` | Whether prompt should be shown |
| `isEnforced` | `boolean` | Whether 2FA is mandatory |
| `has2FA` | `boolean` | Whether user has 2FA set up |
| `gracePeriodEnd` | `Date` | When grace period expires |
| `isInGracePeriod` | `boolean` | Whether user is in grace period |
| `dismissReminder` | `() => void` | Dismiss reminder function |
| `skipReminder` | `() => void` | Skip reminder function |
| `resetDismissal` | `() => void` | Reset dismissal state |

### TwoFactorGate Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Content to show if 2FA is set up |
| `action` | `string` | `"this action"` | Description of sensitive action |
| `fallback` | `ReactNode` | `undefined` | Custom fallback content |
| `config` | `object` | `{}` | 2FA prompt configuration |

## 🤝 Contributing

### Development Setup

1. Install dependencies: `pnpm install`
2. Start development server: `pnpm dev`
3. Visit demo page: `/admin/2fa-prompting`

### Testing

```bash
# Run tests
pnpm test

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

### Code Style

- Follow existing TypeScript patterns
- Use Tailwind CSS for styling
- Maintain responsive design
- Add JSDoc comments for complex logic

## 📄 License

This system is part of the Authless SaaS kernel and follows the same licensing terms.

---

For questions or support, please refer to the main project documentation or create an issue in the repository.

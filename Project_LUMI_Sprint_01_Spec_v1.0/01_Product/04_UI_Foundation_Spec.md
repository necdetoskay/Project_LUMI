# UI Foundation Specification

## Routes

- `/` — public landing or redirect.
- `/status` — technical status page.
- `/app` — protected application shell.
- `/app/overview` — placeholder overview.
- `not-found` — branded not-found experience.
- global error boundary — safe recovery screen.

## Application shell

Required elements:

- LUMI wordmark or text logo;
- top bar;
- side navigation on desktop;
- compact navigation on small screens;
- current environment indicator outside production;
- user/session placeholder;
- main content area;
- accessible skip-to-content link.

## Navigation placeholders

Display but disable or mark as “coming later”:

- Children
- Worlds
- Stories
- Characters
- Library
- Parent Guidance
- Settings

## Status page sections

1. Application status.
2. Database readiness.
3. Version and build metadata.
4. Current environment.
5. Last refresh timestamp.
6. Manual refresh action.

## Accessibility baseline

- Semantic landmarks.
- Keyboard-operable navigation.
- Visible focus indicators.
- Form labels.
- Minimum WCAG AA contrast.
- Status is not communicated by color alone.
- Reduced-motion preference respected.

## Responsive behavior

- Minimum supported width: 360 px.
- Navigation collapses below desktop breakpoint.
- No horizontal scrolling in normal content.
- Status cards stack vertically on narrow screens.

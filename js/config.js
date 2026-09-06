export const API_BASE_URL = 'https://api.haxnation.org/events/api';

// Publishable site key: a PUBLIC API key of the haxnation community, scoped
// via allowedDomains to the haxnation origins. It carries no privilege —
// every write is still gated server-side on session + registration +
// check-in + payment-or-credits. It exists so the main site goes through the
// exact same API-key enforcement as third parties (no origin-based bypass).
export const HAX_SITE_API_KEY = 'HAX_bbcec1497f3041f9831ca27214d3fd6acc551346a7eb3904';

export const state = {
    currentUser:          null,
    currentEventDetails:  null,
    currentManageEventId: null,
};
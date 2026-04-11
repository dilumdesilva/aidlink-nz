export interface Incident {
  /** Full display name shown in the incident pill, e.g. "Cyclone Vaianu" */
  name: string
  /** Short version used in the marquee disclaimer line */
  shortName: string
  /** Optional external tracking URL (e.g. zoom.earth, NEMA, MetService) */
  trackingUrl?: string
}

// Single source of truth for the active event. Update here when the
// situation changes — TopBar pill and Footer marquee both read from this.
export const CURRENT_INCIDENT: Incident = {
  name: 'Cyclone Vaianu',
  shortName: 'Cyclone Vaianu',
  trackingUrl: 'https://zoom.earth/storms/vaianu-2026/',
}

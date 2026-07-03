/**
 * Bulk sweep ceiling, shared by the server actions (hard limit) and the
 * client selection UI (select-all cap) so the two can never disagree.
 */
export const MAX_BULK = 50;

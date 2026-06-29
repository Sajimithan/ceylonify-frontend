import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatListingPriceSummary, type ListingPricingFields } from './listingPrice';

export type SavedRoutePlanStop = {
  itemId?: string | null;
  listingId?: string | null;
  customId?: string | null;
  plannedDate: string;
  title?: string | null;
  placeName?: string | null;
  isCustom?: boolean;
};

export type CustomRouteDestination = {
  id: string;
  placeId: string;
  title: string;
  placeName: string;
  lat: number;
  lng: number;
  plannedDate?: string;
};

export type PlanStopKind = 'event' | 'custom';

export type ResolvedPlanStop = {
  key: string;
  kind: PlanStopKind;
  id: string;
  itineraryItemId?: string;
  listingId?: string;
  customId?: string;
  title: string;
  placeName: string;
  plannedDate: string;
  lat: number;
  lng: number;
  type?: string;
  imageUrl?: string | null;
  description?: string;
  price?: string;
  startDateTime?: string;
};

export type RoutePlanSegment = {
  title?: string | null;
  bullet: string;
  isCustom?: boolean;
  isTravel?: boolean;
};

export type RoutePlanItemMapping = {
  itemId?: string | null;
  customId?: string | null;
  listingId?: string | null;
  plannedDate: string;
  title: string;
  placeName: string;
  dayHeader: string;
  bullet: string;
  segments?: RoutePlanSegment[];
  isCustom?: boolean;
};

export type ItinerarySnapshotEntry = {
  itemId: string;
  listingId: string;
  plannedDate: string;
  title: string;
  placeName: string;
};

export type SavedRoutePlan = {
  summary: string;
  plan: string;
  savedAt: number;
  dates?: string[];
  stops?: SavedRoutePlanStop[];
  mappings?: RoutePlanItemMapping[];
  itinerarySnapshot?: ItinerarySnapshotEntry[];
  stopOrder?: string[];
  customDestinations?: CustomRouteDestination[];
  excludedEventIds?: string[];
};

export type ParsedRoutePlanDay = { header: string; lines: string[] };

export type ItineraryItemForRoute = {
  id: string;
  listingId: string;
  plannedDate: string;
  listingTitle?: string | null;
  listingPlaceName?: string | null;
  listingImageUrl?: string | null;
  listingType?: string | null;
  note?: string | null;
};

export type ItineraryChangeResult = {
  hasNewItems: boolean;
  hasRemovedMappedItems: boolean;
  hasDateChanges: boolean;
  isStale: boolean;
};

const ROUTE_MATCH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'into', 'near',
  'of', 'on', 'or', 'the', 'to', 'with', 'visit', 'head', 'stop',
  'explore', 'enjoy', 'arrive', 'then', 'next', 'continue',
]);

const STORAGE_PREFIX = '@ceylonify/route_plan_';
const CONFIG_PREFIX = '@ceylonify/route_plan_config_';

export function eventStopKey(itemId: string): string {
  return `e:${itemId}`;
}

export function customStopKey(customId: string): string {
  return `c:${customId}`;
}

export function normalizePlannedDateInput(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)).toISOString();
}

function getPlannedTimeForKey(
  key: string,
  events: ItineraryItemForRoute[],
  customs: CustomRouteDestination[],
): number {
  if (key.startsWith('e:')) {
    const item = events.find((entry) => eventStopKey(entry.id) === key);
    const time = item?.plannedDate ? new Date(item.plannedDate).getTime() : NaN;
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  }
  if (key.startsWith('c:')) {
    const custom = customs.find((entry) => customStopKey(entry.id) === key);
    const time = custom?.plannedDate ? new Date(custom.plannedDate).getTime() : NaN;
    return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  }
  return Number.MAX_SAFE_INTEGER;
}

export function resolveStopOrder(
  events: ItineraryItemForRoute[],
  customs: CustomRouteDestination[],
  savedOrder: string[] = [],
  excludedEventIds: string[] = [],
): string[] {
  const excluded = new Set(excludedEventIds);
  const activeEvents = events.filter((event) => !excluded.has(event.id));
  const eventKeys = activeEvents.map((event) => eventStopKey(event.id));
  const customKeys = customs.map((custom) => customStopKey(custom.id));
  const validKeys = new Set([...eventKeys, ...customKeys]);

  return [...eventKeys, ...customKeys]
    .filter((key) => validKeys.has(key))
    .sort((a, b) => {
      const timeDiff = getPlannedTimeForKey(a, activeEvents, customs) - getPlannedTimeForKey(b, activeEvents, customs);
      if (timeDiff !== 0) return timeDiff;
      const idxA = savedOrder.indexOf(a);
      const idxB = savedOrder.indexOf(b);
      if (idxA >= 0 && idxB >= 0) return idxA - idxB;
      if (idxA >= 0) return -1;
      if (idxB >= 0) return 1;
      return a.localeCompare(b);
    });
}

export function inferPlannedDateForIndex(
  order: string[],
  index: number,
  events: ItineraryItemForRoute[],
): string {
  for (let i = index - 1; i >= 0; i--) {
    const key = order[i];
    if (!key.startsWith('e:')) continue;
    const event = events.find((item) => eventStopKey(item.id) === key);
    if (event) return event.plannedDate;
  }
  for (let i = index + 1; i < order.length; i++) {
    const key = order[i];
    if (!key.startsWith('e:')) continue;
    const event = events.find((item) => eventStopKey(item.id) === key);
    if (event) return event.plannedDate;
  }
  const sorted = [...events].sort(
    (a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime(),
  );
  return sorted[0]?.plannedDate ?? new Date().toISOString();
}

export function buildResolvedPlanStops(
  order: string[],
  events: ItineraryItemForRoute[],
  customs: CustomRouteDestination[],
  listingById: Map<string, {
    lat?: number;
    lng?: number;
    title?: string;
    description?: string;
    type?: string;
    placeName?: string;
    imageUrl?: string | null;
    price?: string;
    priceTiers?: ListingPricingFields['priceTiers'];
    startDateTime?: string | null;
  }>,
): ResolvedPlanStop[] {
  const resolved: ResolvedPlanStop[] = [];

  order.forEach((key, index) => {
    if (key.startsWith('e:')) {
      const itemId = key.slice(2);
      const item = events.find((entry) => entry.id === itemId);
      if (!item) return;
      const listing = listingById.get(item.listingId);
      if (!listing?.lat || !listing?.lng) return;
      resolved.push({
        key,
        kind: 'event',
        id: item.listingId,
        itineraryItemId: item.id,
        listingId: item.listingId,
        title: item.listingTitle ?? listing.title ?? 'Event',
        placeName: item.listingPlaceName ?? listing.placeName ?? '',
        plannedDate: item.plannedDate,
        lat: listing.lat,
        lng: listing.lng,
        type: item.listingType ?? listing.type,
        imageUrl: listing.imageUrl,
        description: listing.description,
        price: formatListingPriceSummary(listing) ?? listing.price,
        startDateTime: listing.startDateTime ?? undefined,
      });
      return;
    }

    if (key.startsWith('c:')) {
      const customId = key.slice(2);
      const custom = customs.find((entry) => entry.id === customId);
      if (!custom) return;
      resolved.push({
        key,
        kind: 'custom',
        id: `custom:${customId}`,
        customId: custom.id,
        title: custom.title,
        placeName: custom.placeName,
        plannedDate: custom.plannedDate || inferPlannedDateForIndex(order, index, events),
        lat: custom.lat,
        lng: custom.lng,
        type: 'PLACE',
      });
    }
  });

  return resolved;
}

export function moveStopInOrder(order: string[], key: string, direction: -1 | 1): string[] {
  if (!key.startsWith('c:')) return order;
  const index = order.indexOf(key);
  if (index < 0) return order;
  const target = index + direction;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Move a custom destination key to a visual index in the full stop list. */
export function moveStopKeyToIndex(order: string[], key: string, targetIndex: number): string[] {
  if (!key.startsWith('c:')) return order;
  const fromIndex = order.indexOf(key);
  if (fromIndex < 0 || fromIndex === targetIndex) return order;
  const next = [...order];
  const [item] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

export async function loadRoutePlanConfig(uid: string): Promise<{
  stopOrder: string[];
  customDestinations: CustomRouteDestination[];
  excludedEventIds: string[];
}> {
  const raw = await AsyncStorage.getItem(`${CONFIG_PREFIX}${uid}`);
  if (!raw) return { stopOrder: [], customDestinations: [], excludedEventIds: [] };
  try {
    const parsed = JSON.parse(raw) as {
      stopOrder?: string[];
      customDestinations?: CustomRouteDestination[];
      excludedEventIds?: string[];
    };
    return {
      stopOrder: parsed.stopOrder ?? [],
      customDestinations: parsed.customDestinations ?? [],
      excludedEventIds: parsed.excludedEventIds ?? [],
    };
  } catch {
    return { stopOrder: [], customDestinations: [], excludedEventIds: [] };
  }
}

export async function saveRoutePlanConfig(
  uid: string,
  config: {
    stopOrder: string[];
    customDestinations: CustomRouteDestination[];
    excludedEventIds: string[];
  },
): Promise<void> {
  await AsyncStorage.setItem(`${CONFIG_PREFIX}${uid}`, JSON.stringify(config));
}

export function getPlannedDateKey(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export function formatPlannedDateLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function normalizeRouteText(text?: string | null): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeRouteText(text?: string | null): string[] {
  return normalizeRouteText(text)
    .split(' ')
    .filter((token) => token.length > 1 && !ROUTE_MATCH_STOP_WORDS.has(token));
}

export function buildRouteStopSignature(stop: {
  listingId?: string | null;
  plannedDate?: string | null;
  title?: string | null;
  placeName?: string | null;
  listingTitle?: string | null;
  listingPlaceName?: string | null;
}): string {
  return [
    stop.listingId ?? '',
    getPlannedDateKey(stop.plannedDate),
    normalizeRouteText(stop.title ?? stop.listingTitle ?? ''),
    normalizeRouteText(stop.placeName ?? stop.listingPlaceName ?? ''),
  ].join('|');
}

export function groupByDate(items: ItineraryItemForRoute[]) {
  const map: Record<string, ItineraryItemForRoute[]> = {};
  items.forEach((item) => {
    const key = getPlannedDateKey(item.plannedDate);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(item);
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoDate, dayItems]) => ({
      isoDate,
      label: formatPlannedDateLabel(isoDate),
      items: dayItems,
    }));
}

export function normalizePlanText(planText: string): string {
  if (!planText?.trim()) return '';

  return planText
    .replace(/\r\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .split('\n')
    .map((line) => {
      let trimmed = line.trim();
      if (!trimmed) return '';

      trimmed = trimmed.replace(/^[*+]\s+/, '• ');

      if (/^\d+\.\s+/.test(trimmed) && !/^Day\s+\d+/i.test(trimmed)) {
        trimmed = trimmed.replace(/^\d+\.\s+/, '• ');
      }

      const dayMatch = trimmed.match(/^(Day\s+\d+)\s*[:\-–—]\s*(.*)$/i);
      if (dayMatch) {
        const rest = dayMatch[2]?.trim() ?? '';
        trimmed = rest ? `${dayMatch[1]} — ${rest}` : dayMatch[1];
      }

      return trimmed;
    })
    .filter(Boolean)
    .join('\n');
}

function isDayHeaderLine(line: string): boolean {
  return /^Day\s+\d+/i.test(line.trim());
}

export function parsePlanDays(planText: string): ParsedRoutePlanDay[] {
  const normalized = normalizePlanText(planText);
  const days: ParsedRoutePlanDay[] = [];
  let current: ParsedRoutePlanDay | null = null;

  normalized.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (isDayHeaderLine(trimmed)) {
      if (current) days.push(current);
      current = { header: trimmed, lines: [] };
      return;
    }
    if (current) current.lines.push(trimmed);
  });

  if (current) days.push(current);

  if (days.length === 0 && normalized.trim()) {
    return [{
      header: 'Your route plan',
      lines: normalized.split('\n').map((line) => line.trim()).filter(Boolean),
    }];
  }

  return days;
}

function isPlanBulletLine(line: string): boolean {
  const trimmed = line.trim();
  return /^[•\-*]\s*/.test(trimmed) || (/^\d+\.\s+/.test(trimmed) && !isDayHeaderLine(trimmed));
}

function cleanPlanBullet(line: string): string {
  return line.trim().replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s+/, '');
}

function extractBulletLeadTitle(bullet: string): string {
  const cleaned = cleanPlanBullet(bullet);
  const parts = cleaned.split(/\s+[—–-]\s+/);
  return (parts[0] ?? cleaned).trim();
}

function isMetaPlanBullet(bullet: string): boolean {
  const norm = normalizeRouteText(bullet);
  if (!norm) return true;
  return (
    norm.startsWith('travel from')
    || norm.startsWith('travel to')
    || norm.startsWith('transport')
    || norm.startsWith('travel')
    || norm.startsWith('meals')
    || norm.startsWith('meal')
    || norm.startsWith('eat at')
    || norm.startsWith('tip')
    || norm.startsWith('note')
    || norm.startsWith('evening')
  );
}

function isTravelPlanBullet(bullet: string): boolean {
  const norm = normalizeRouteText(bullet);
  return norm.startsWith('travel from') || norm.startsWith('travel to');
}

function getStopBulletsForDay(day: ParsedRoutePlanDay): string[] {
  return day.lines
    .filter(isPlanBulletLine)
    .map(cleanPlanBullet)
    .filter((bullet) => !isMetaPlanBullet(bullet));
}

function bulletMatchesCustomStop(bullet: string, savedStopsForDay?: SavedRoutePlanStop[]): boolean {
  if (!savedStopsForDay?.length) return false;
  const lead = normalizeRouteText(extractBulletLeadTitle(bullet));
  if (!lead) return false;
  return savedStopsForDay.some((stop) => {
    if (!stop.isCustom) return false;
    const title = normalizeRouteText(stop.title ?? stop.placeName ?? '');
    if (!title) return false;
    return lead === title || lead.includes(title) || title.includes(lead);
  });
}

function orderItemsBySavedStops(
  items: ItineraryItemForRoute[],
  savedStopsForDay?: SavedRoutePlanStop[],
): ItineraryItemForRoute[] {
  if (!savedStopsForDay?.length) return items;
  const orderByItemId = new Map<string, number>();
  savedStopsForDay.forEach((stop, index) => {
    if (stop.itemId) orderByItemId.set(stop.itemId, index);
  });
  return [...items].sort((a, b) => {
    const left = orderByItemId.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const right = orderByItemId.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

function scorePlanBulletForItem(bullet: string, item: ItineraryItemForRoute): number {
  const bulletNorm = normalizeRouteText(bullet);
  if (!bulletNorm) return 0;

  const title = item.listingTitle ?? '';
  const place = item.listingPlaceName ?? '';
  const titleNorm = normalizeRouteText(title);
  const placeNorm = normalizeRouteText(place);
  const leadNorm = normalizeRouteText(extractBulletLeadTitle(bullet));

  let score = 0;
  if (titleNorm && leadNorm === titleNorm) score += 200;
  if (titleNorm && (bulletNorm.includes(titleNorm) || titleNorm.includes(bulletNorm))) score += 120;
  if (placeNorm && (bulletNorm.includes(placeNorm) || placeNorm.includes(bulletNorm))) score += 25;

  const bulletTokens = new Set(tokenizeRouteText(bullet));
  const titleTokens = tokenizeRouteText(title);
  const placeTokens = tokenizeRouteText(place);
  const titleHits = titleTokens.filter((token) => bulletTokens.has(token)).length;
  const placeHits = placeTokens.filter((token) => bulletTokens.has(token)).length;

  score += titleHits * 20;
  score += placeHits * 6;
  if (titleHits >= 2) score += 25;
  if (titleTokens.length > 0 && titleHits === titleTokens.length) score += 20;
  if (titleHits > 0 && placeHits > 0) score += 10;

  return score;
}

type PlanVisitSegment = {
  header: string;
  stopBullet: string;
  travelBullet?: string;
};

function scoreStopToBullet(stop: SavedRoutePlanStop, bullet: string): number {
  const bulletNorm = normalizeRouteText(bullet);
  if (!bulletNorm) return 0;

  const title = stop.title ?? '';
  const place = stop.placeName ?? '';
  const titleNorm = normalizeRouteText(title);
  const placeNorm = normalizeRouteText(place);
  const leadNorm = normalizeRouteText(extractBulletLeadTitle(bullet));

  let score = 0;
  if (titleNorm && leadNorm === titleNorm) score += 200;
  if (titleNorm && (bulletNorm.includes(titleNorm) || titleNorm.includes(bulletNorm))) score += 120;
  if (placeNorm && (bulletNorm.includes(placeNorm) || placeNorm.includes(bulletNorm))) score += 25;

  const bulletTokens = new Set(tokenizeRouteText(bullet));
  const titleTokens = tokenizeRouteText(title);
  const placeTokens = tokenizeRouteText(place);
  const titleHits = titleTokens.filter((token) => bulletTokens.has(token)).length;
  const placeHits = placeTokens.filter((token) => bulletTokens.has(token)).length;

  score += titleHits * 20;
  score += placeHits * 6;
  if (titleHits >= 2) score += 25;
  if (titleTokens.length > 0 && titleHits === titleTokens.length) score += 20;
  if (titleHits > 0 && placeHits > 0) score += 10;

  return score;
}

/** Flatten AI plan into ordered visit segments (stop + optional travel leg after it). */
function extractPlanSegmentsInOrder(planText: string): PlanVisitSegment[] {
  const segments: PlanVisitSegment[] = [];

  parsePlanDays(planText).forEach((day) => {
    for (let i = 0; i < day.lines.length; i++) {
      const line = day.lines[i].trim();
      if (!isPlanBulletLine(line)) continue;

      const bullet = cleanPlanBullet(line);
      if (isMetaPlanBullet(bullet) && !isTravelPlanBullet(bullet)) continue;
      if (isTravelPlanBullet(bullet)) continue;

      let travelBullet: string | undefined;
      for (let j = i + 1; j < day.lines.length; j++) {
        const nextLine = day.lines[j].trim();
        if (!isPlanBulletLine(nextLine)) continue;
        const nextBullet = cleanPlanBullet(nextLine);
        if (isTravelPlanBullet(nextBullet)) {
          travelBullet = nextBullet;
        }
        break;
      }

      segments.push({ header: day.header, stopBullet: bullet, travelBullet });
    }
  });

  return segments;
}

function matchStopsToPlanSegments(
  stops: SavedRoutePlanStop[],
  segments: PlanVisitSegment[],
): Array<PlanVisitSegment | null> {
  const matched: Array<PlanVisitSegment | null> = [];
  let segmentIndex = 0;

  stops.forEach((stop) => {
    if (segmentIndex >= segments.length) {
      matched.push(null);
      return;
    }

    let bestIndex = -1;
    let bestScore = 24;
    const maxLookahead = Math.min(segments.length, segmentIndex + 4);

    for (let i = segmentIndex; i < maxLookahead; i++) {
      const score = scoreStopToBullet(stop, segments[i].stopBullet);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) bestIndex = segmentIndex;

    matched.push(segments[bestIndex]);
    segmentIndex = bestIndex + 1;
  });

  return matched;
}

function appendSegmentLines(
  target: RoutePlanSegment[],
  segment: PlanVisitSegment,
  stop: SavedRoutePlanStop,
) {
  target.push({
    title: stop.title ?? stop.placeName ?? '',
    bullet: segment.stopBullet,
    isCustom: !!stop.isCustom,
  });
  if (segment.travelBullet) {
    target.push({
      bullet: segment.travelBullet,
      isCustom: !!stop.isCustom,
      isTravel: true,
    });
  }
}

/** Map plan text to one mapping per stop (events and destinations each get their own card). */
function buildVisitOrderMappings(
  planText: string,
  itineraryItems: ItineraryItemForRoute[],
  stops: SavedRoutePlanStop[],
): RoutePlanItemMapping[] {
  if (!stops.length || !planText.trim()) return [];

  const segments = extractPlanSegmentsInOrder(planText);
  if (!segments.length) return [];

  const matchedSegments = matchStopsToPlanSegments(stops, segments);
  const mappings: RoutePlanItemMapping[] = [];

  stops.forEach((stop, index) => {
    const segment = matchedSegments[index];
    if (!segment) return;

    const routeSegments: RoutePlanSegment[] = [];
    appendSegmentLines(routeSegments, segment, stop);

    if (stop.isCustom && stop.customId) {
      mappings.push({
        customId: stop.customId,
        itemId: null,
        listingId: null,
        plannedDate: stop.plannedDate,
        title: stop.title ?? '',
        placeName: stop.placeName ?? '',
        dayHeader: segment.header,
        bullet: routeSegments[0]?.bullet ?? segment.stopBullet,
        segments: routeSegments,
        isCustom: true,
      });
      return;
    }

    if (!stop.itemId) return;
    const item = itineraryItems.find((entry) => entry.id === stop.itemId);
    if (!item) return;

    mappings.push({
      itemId: item.id,
      customId: null,
      listingId: item.listingId,
      plannedDate: item.plannedDate,
      title: item.listingTitle ?? '',
      placeName: item.listingPlaceName ?? '',
      dayHeader: segment.header,
      bullet: routeSegments[0]?.bullet ?? segment.stopBullet,
      segments: routeSegments,
      isCustom: false,
    });
  });

  return mappings;
}

export function matchDayPlanToItems(
  day: ParsedRoutePlanDay,
  items: ItineraryItemForRoute[],
  savedStopsForDay?: SavedRoutePlanStop[],
): Record<string, { header: string; bullet: string }> {
  const stopBullets = getStopBulletsForDay(day);
  if (!stopBullets.length || !items.length) return {};

  const savedStopIds = new Set((savedStopsForDay ?? []).map((stop) => stop.itemId).filter(Boolean));
  const savedSignatures = new Set(
    (savedStopsForDay ?? []).map((stop) => buildRouteStopSignature(stop)).filter(Boolean),
  );

  const eligibleItems = orderItemsBySavedStops(
    items.filter((item) => {
      if (!savedStopsForDay?.length) return true;
      if (savedStopIds.has(item.id)) return true;
      return savedSignatures.has(buildRouteStopSignature({
        listingId: item.listingId,
        plannedDate: item.plannedDate,
        listingTitle: item.listingTitle,
        listingPlaceName: item.listingPlaceName,
      }));
    }),
    savedStopsForDay,
  );

  const MIN_SCORE = 25;
  const matchedItemIds = new Set<string>();
  const matchedBulletIndexes = new Set<number>();
  const itemPlansById: Record<string, { header: string; bullet: string }> = {};

  eligibleItems.forEach((item) => {
    let bestIndex = -1;
    let bestScore = MIN_SCORE - 1;

    stopBullets.forEach((bullet, bulletIndex) => {
      if (matchedBulletIndexes.has(bulletIndex)) return;
      const score = scorePlanBulletForItem(bullet, item);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = bulletIndex;
      }
    });

    if (bestIndex >= 0) {
      matchedItemIds.add(item.id);
      matchedBulletIndexes.add(bestIndex);
      itemPlansById[item.id] = { header: day.header, bullet: stopBullets[bestIndex] };
    }
  });

  const unmatchedItems = eligibleItems.filter((item) => !matchedItemIds.has(item.id));
  const unmatchedBulletIndexes = stopBullets
    .map((_, bulletIndex) => bulletIndex)
    .filter((bulletIndex) => !matchedBulletIndexes.has(bulletIndex));
  const eventBullets = unmatchedBulletIndexes.filter(
    (bulletIndex) => !bulletMatchesCustomStop(stopBullets[bulletIndex], savedStopsForDay),
  );

  unmatchedItems.forEach((item, index) => {
    const bulletIndex = eventBullets[index] ?? unmatchedBulletIndexes[index];
    if (bulletIndex == null) return;
    itemPlansById[item.id] = { header: day.header, bullet: stopBullets[bulletIndex] };
  });

  return itemPlansById;
}

export function buildItinerarySnapshot(items: ItineraryItemForRoute[]): ItinerarySnapshotEntry[] {
  return items.map((item) => ({
    itemId: item.id,
    listingId: item.listingId,
    plannedDate: item.plannedDate,
    title: item.listingTitle ?? '',
    placeName: item.listingPlaceName ?? '',
  }));
}

export function buildStopsFromItinerary(items: ItineraryItemForRoute[]): SavedRoutePlanStop[] {
  return items.map((item) => ({
    itemId: item.id,
    listingId: item.listingId,
    plannedDate: item.plannedDate,
    title: item.listingTitle ?? '',
    placeName: item.listingPlaceName ?? '',
    isCustom: false,
  }));
}

export function buildStopsFromResolved(resolved: ResolvedPlanStop[]): SavedRoutePlanStop[] {
  return resolved.map((stop) => ({
    itemId: stop.itineraryItemId ?? null,
    listingId: stop.listingId ?? null,
    customId: stop.customId ?? null,
    plannedDate: stop.plannedDate,
    title: stop.title,
    placeName: stop.placeName,
    isCustom: stop.kind === 'custom',
  }));
}

export function buildMappingsFromPlan(
  planText: string,
  itineraryItems: ItineraryItemForRoute[],
  stops?: SavedRoutePlanStop[],
): RoutePlanItemMapping[] {
  const orderedStops = stops ?? buildStopsFromItinerary(itineraryItems);
  return buildVisitOrderMappings(planText, itineraryItems, orderedStops);
}

function getOrderedPlanStops(
  plan: SavedRoutePlan,
  itineraryItems: ItineraryItemForRoute[],
): SavedRoutePlanStop[] {
  if (!plan.stopOrder?.length) {
    return plan.stops?.length ? plan.stops : buildStopsFromItinerary(itineraryItems);
  }

  const stopByKey = new Map<string, SavedRoutePlanStop>();
  (plan.stops ?? []).forEach((stop) => {
    if (stop.itemId) stopByKey.set(eventStopKey(stop.itemId), stop);
    if (stop.customId) stopByKey.set(customStopKey(stop.customId), stop);
  });

  const customById = new Map((plan.customDestinations ?? []).map((custom) => [custom.id, custom]));
  const eventByItemId = new Map(itineraryItems.map((item) => [item.id, item]));
  const ordered: SavedRoutePlanStop[] = [];

  plan.stopOrder.forEach((key, index) => {
    const existing = stopByKey.get(key);
    if (existing) {
      ordered.push(existing);
      return;
    }

    if (key.startsWith('e:')) {
      const item = eventByItemId.get(key.slice(2));
      if (!item) return;
      ordered.push({
        itemId: item.id,
        listingId: item.listingId,
        plannedDate: item.plannedDate,
        title: item.listingTitle ?? '',
        placeName: item.listingPlaceName ?? '',
        isCustom: false,
      });
      return;
    }

    if (key.startsWith('c:')) {
      const custom = customById.get(key.slice(2));
      if (!custom) return;
      ordered.push({
        customId: custom.id,
        plannedDate: custom.plannedDate || inferPlannedDateForIndex(plan.stopOrder ?? [], index, itineraryItems),
        title: custom.title,
        placeName: custom.placeName,
        isCustom: true,
      });
    }
  });

  return ordered.length ? ordered : (plan.stops ?? buildStopsFromItinerary(itineraryItems));
}

/** Rebuild per-card mappings from saved plan text (fixes partial/stale mappings). */
export function refreshRoutePlanMappings(
  plan: SavedRoutePlan,
  itineraryItems: ItineraryItemForRoute[],
): SavedRoutePlan {
  if (!plan.plan?.trim()) return plan;
  const stops = getOrderedPlanStops(plan, itineraryItems);
  return {
    ...plan,
    stops,
    mappings: buildMappingsFromPlan(plan.plan, itineraryItems, stops),
  };
}

export function getMappingForItem(
  mappings: RoutePlanItemMapping[] | undefined,
  itemId: string,
): { header: string; segments: RoutePlanSegment[] } | null {
  if (!mappings?.length) return null;
  const found = mappings.find((m) => m.itemId === itemId && !m.isCustom);
  if (!found) return null;
  const segments = found.segments?.length
    ? found.segments
    : [{ bullet: found.bullet, isCustom: false }];
  return { header: found.dayHeader, segments };
}

export function getMappingForCustom(
  mappings: RoutePlanItemMapping[] | undefined,
  customId: string,
): { header: string; segments: RoutePlanSegment[] } | null {
  if (!mappings?.length) return null;
  const found = mappings.find((m) => m.customId === customId);
  if (!found) return null;
  const segments = found.segments?.length
    ? found.segments
    : [{ bullet: found.bullet, isCustom: true }];
  return { header: found.dayHeader, segments };
}

export function buildItineraryDayEntries<T extends ItineraryItemForRoute>(
  isoDate: string,
  dayItems: T[],
  customDestinations: CustomRouteDestination[] = [],
): Array<
  | { kind: 'event'; item: T; sortTime: number }
  | { kind: 'custom'; custom: CustomRouteDestination; sortTime: number }
> {
  const entries: Array<
    | { kind: 'event'; item: T; sortTime: number }
    | { kind: 'custom'; custom: CustomRouteDestination; sortTime: number }
  > = dayItems.map((item) => ({
    kind: 'event',
    item,
    sortTime: new Date(item.plannedDate).getTime(),
  }));

  customDestinations
    .filter((custom) => getPlannedDateKey(custom.plannedDate) === isoDate)
    .forEach((custom) => {
      entries.push({
        kind: 'custom',
        custom,
        sortTime: new Date(custom.plannedDate ?? `${isoDate}T12:00:00.000Z`).getTime(),
      });
    });

  return entries.sort((a, b) => a.sortTime - b.sortTime);
}

export function detectItineraryChanges(
  snapshot: ItinerarySnapshotEntry[] | undefined,
  currentItems: ItineraryItemForRoute[],
): ItineraryChangeResult {
  if (!snapshot?.length) {
    return {
      hasNewItems: currentItems.length > 0,
      hasRemovedMappedItems: false,
      hasDateChanges: false,
      isStale: currentItems.length > 0,
    };
  }

  const snapshotById = new Map(snapshot.map((entry) => [entry.itemId, entry]));
  const currentIds = new Set(currentItems.map((item) => item.id));
  const snapshotIds = new Set(snapshot.map((entry) => entry.itemId));

  const hasNewItems = currentItems.some((item) => !snapshotIds.has(item.id));
  const hasRemovedMappedItems = snapshot.some((entry) => !currentIds.has(entry.itemId));

  let hasDateChanges = false;
  for (const item of currentItems) {
    const snap = snapshotById.get(item.id);
    if (!snap) continue;
    if (getPlannedDateKey(snap.plannedDate) !== getPlannedDateKey(item.plannedDate)) {
      hasDateChanges = true;
      break;
    }
    if (normalizeRouteText(snap.title) !== normalizeRouteText(item.listingTitle)) {
      hasDateChanges = true;
      break;
    }
    if (normalizeRouteText(snap.placeName) !== normalizeRouteText(item.listingPlaceName)) {
      hasDateChanges = true;
      break;
    }
  }

  return {
    hasNewItems,
    hasRemovedMappedItems,
    hasDateChanges,
    isStale: hasNewItems || hasRemovedMappedItems || hasDateChanges,
  };
}

function migrateLegacyPlan(
  plan: SavedRoutePlan,
  currentItems: ItineraryItemForRoute[],
): SavedRoutePlan {
  if (plan.mappings?.length) return plan;
  if (!plan.plan?.trim()) return { ...plan, mappings: [], itinerarySnapshot: [] };

  if (!plan.stops?.length && !plan.dates?.length) {
    return { ...plan, mappings: [], itinerarySnapshot: plan.itinerarySnapshot ?? [] };
  }

  const effectiveStops = plan.stops?.length ? plan.stops : [];

  const snapshotItems = plan.itinerarySnapshot?.length
    ? currentItems.filter((item) =>
        plan.itinerarySnapshot!.some((s) => s.itemId === item.id),
      )
    : currentItems.filter((item) =>
        effectiveStops.some(
          (stop) =>
            stop.itemId === item.id ||
            buildRouteStopSignature(stop) === buildRouteStopSignature({
              listingId: item.listingId,
              plannedDate: item.plannedDate,
              listingTitle: item.listingTitle,
              listingPlaceName: item.listingPlaceName,
            }),
        ),
      );

  const mappings = buildMappingsFromPlan(plan.plan, snapshotItems, effectiveStops);
  const dates =
    plan.dates?.length
      ? plan.dates
      : [...new Set(effectiveStops.map((s) => getPlannedDateKey(s.plannedDate)).filter(Boolean))].sort();

  return {
    ...plan,
    stops: effectiveStops,
    dates,
    mappings,
    itinerarySnapshot: plan.itinerarySnapshot ?? buildItinerarySnapshot(snapshotItems),
  };
}

export function buildSavedRoutePlan(
  summary: string,
  plan: string,
  itineraryItems: ItineraryItemForRoute[],
  config?: {
    stopOrder: string[];
    customDestinations: CustomRouteDestination[];
    resolvedStops: ResolvedPlanStop[];
    excludedEventIds?: string[];
  },
): SavedRoutePlan {
  const stops = config?.resolvedStops?.length
    ? buildStopsFromResolved(config.resolvedStops)
    : buildStopsFromItinerary(itineraryItems);
  const dates = [...new Set(stops.map((s) => getPlannedDateKey(s.plannedDate)).filter(Boolean))].sort();
  const mappings = buildMappingsFromPlan(plan, itineraryItems, stops);

  return {
    summary,
    plan,
    savedAt: Date.now(),
    dates,
    stops,
    mappings,
    itinerarySnapshot: buildItinerarySnapshot(itineraryItems),
    stopOrder: config?.stopOrder ?? [],
    customDestinations: config?.customDestinations ?? [],
    excludedEventIds: config?.excludedEventIds ?? [],
  };
}

export async function loadRoutePlan(
  uid: string,
  currentItems: ItineraryItemForRoute[] = [],
): Promise<SavedRoutePlan | null> {
  const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${uid}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedRoutePlan;
    const migrated = migrateLegacyPlan(parsed, currentItems);
    let plan = refreshRoutePlanMappings(migrated, currentItems);

    if (!plan.stopOrder?.length && !plan.customDestinations?.length) {
      const config = await loadRoutePlanConfig(uid);
      plan = {
        ...plan,
        stopOrder: config.stopOrder,
        customDestinations: config.customDestinations,
      };
    }

    return plan;
  } catch {
    return null;
  }
}

export async function saveRoutePlan(uid: string, plan: SavedRoutePlan): Promise<void> {
  await AsyncStorage.setItem(`${STORAGE_PREFIX}${uid}`, JSON.stringify(plan));
}

export async function clearRoutePlan(uid: string): Promise<void> {
  await AsyncStorage.removeItem(`${STORAGE_PREFIX}${uid}`);
}

export function routePlanStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

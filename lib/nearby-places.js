export const kinds = ['shop', 'park', 'station'];

export function validPoint(point) {
    return !!point && Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
}

export function metersBetween(a, b) {
    const rad = Math.PI / 180, lat = (b.lat - a.lat) * rad, lng = (b.lng - a.lng) * rad;
    const h = Math.sin(lat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(lng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

const kindForType = {convenience: 'shop', park: 'park', station: 'station'};
const genericNames = {shop: 'コンビニ', park: '公園', station: '駅'};
const clean = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) : '';
const named = value => {
    const name = clean(value);
    return /^(未知地点|未知|unknown(?: location)?|unnamed)$/i.test(name) ? '' : name;
};

// Rank the existing exported spots by exact straight-line distance from departure.
// Distances refer to registered coordinates, not walking routes or public entrances.
export function nearestSpots(spots, origin, radius) {
    const found = new Map();
    if (!validPoint(origin) || !Number.isFinite(radius) || radius <= 0) return {stops: [], missing: [...kinds]};
    for (const spot of spots) {
        if (!validPoint(spot) || ['no', 'private'].includes(spot.access) || ['yes', 'construction'].includes(spot.disused) || spot.abandoned === 'yes') continue;
        const kind = Object.hasOwn(kindForType, spot.type) ? kindForType[spot.type] : null;
        if (!kind) continue;
        const point = {lat: spot.lat, lng: spot.lng};
        const distance = metersBetween(origin, point);
        if (distance > radius || (found.get(kind)?.distance ?? Infinity) <= distance) continue;
        const nameJa = named(spot.nameJa), nameEn = named(spot.nameEn);
        found.set(kind, {kind, ...point, name: nameJa || named(spot.name) || nameEn || genericNames[kind], nameJa, nameEn, distance, spotId: `${spot.type}:${spot.lat},${spot.lng}`});
    }
    return {stops: kinds.flatMap(kind => found.has(kind) ? [{...found.get(kind), distance: Math.round(found.get(kind).distance)}] : []), missing: kinds.filter(kind => !found.has(kind))};
}

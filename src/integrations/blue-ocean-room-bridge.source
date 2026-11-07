import { get } from 'svelte/store';
import { activeFloor, currentProject, detectedRoomsStore, selectedRoomId } from '$lib/stores/project';
import { resolveRooms } from '$lib/utils/roomDetection';

const CHANNEL = 'blue-ocean-openplan3d/v1';

/**
 * Read-only bridge for actual enclosed rooms visible in OpenPlan3D.
 * No CAD updates and no cross-service writes originate here.
 */
export function installBlueOceanRoomBridge(): () => void {
  const session = new URLSearchParams(window.location.search).get('boSession')
    || (window.name.startsWith('boSession:') ? window.name.slice(10) : null);
  if (!session || window.parent === window) return () => {};

  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastPayload = '';

  const emit = () => {
    timer = undefined;
    if (disposed || !get(currentProject)) return;
    const floor = get(activeFloor);
    if (!floor) return;
    const nativeRooms = resolveRooms(floor, get(detectedRoomsStore));
    const selectedId = get(selectedRoomId);
    const seen = new Set<string>();
    const rooms: Array<{ key: string; floorId: string; roomId: string; name: string; area: number }> = [];
    let selectedRoomKey: string | null = null;
    for (const room of nativeRooms) {
      if (!room.walls || room.walls.length < 2 || room.walls.length > 200) continue;
      const key = encodeURIComponent(floor.id) + '::'
        + room.walls.slice().sort().map(encodeURIComponent).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const item = {
        key,
        floorId: floor.id,
        roomId: room.id,
        name: String(room.name || 'Ambiente').slice(0, 120),
        area: Number.isFinite(room.area) ? Math.max(0, room.area) : 0,
      };
      rooms.push(item);
      if (selectedId && selectedId === room.id) selectedRoomKey = key;
      if (rooms.length >= 120) break;
    }
    const payload = JSON.stringify({ rooms, selectedRoomKey, floorId: floor.id });
    if (payload === lastPayload) return;
    lastPayload = payload;
    window.parent.postMessage({
      channel: CHANNEL, session, type: 'room-context', ...JSON.parse(payload),
    }, window.location.origin);
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(emit, 220);
  };
  const stops = [
    activeFloor.subscribe(schedule),
    detectedRoomsStore.subscribe(schedule),
    selectedRoomId.subscribe(schedule),
  ];
  schedule();
  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    for (const stop of stops) stop();
  };
}

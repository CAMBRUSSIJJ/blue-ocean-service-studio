import { z } from 'zod';

const id = z.string().min(1).max(200).refine(value => !['__proto__', 'constructor', 'prototype'].includes(value));
const position = z.object({ x: z.number().int().min(0).max(199), y: z.number().int().min(0).max(199) });
const furniture = z.object({
  id, roomId: id, kind: z.enum(['counter', 'desk', 'station', 'waiting', 'chair', 'kiosk', 'shelf', 'plant', 'bench', 'table', 'printer', 'coffee', 'exam', 'screen', 'stool', 'door']),
  nodeId: z.string().max(200), x: z.number().int().min(0).max(11), y: z.number().int().min(0).max(7),
  rotation: z.union([z.literal(0), z.literal(90)]), width: z.number().int().min(1).max(12).optional(), height: z.number().int().min(1).max(8).optional(),
}).passthrough();
export const spatialWorkspaceSchema = z.object({
  version: z.literal(1), revision: z.number().int().min(1), updatedAt: z.string(),
  environments: z.array(z.object({ id, name: z.string().trim().min(1).max(72), icon: z.string().max(80), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), description: z.string().max(240), team: z.string().max(80) }).passthrough()).max(48),
  assignments: z.record(id, id),
  floorplan: z.object({
    version: z.literal(1), objects: z.array(furniture).max(2000),
    segments: z.array(z.object({ roomId: id, axis: z.enum(['h', 'v']), type: z.enum(['wall', 'door', 'open']), x: z.number().int().min(0).max(12), y: z.number().int().min(0).max(8) })).max(20000).optional(),
    scales: z.record(id, z.number().min(.4).max(2)).optional(),
    wallHeights: z.record(id, z.number().min(1.8).max(4.2)).optional(),
    roomPositions: z.record(id, position).optional(), corridors: z.array(position).max(40000).optional(),
  }).passthrough(),
}).passthrough().superRefine((value, context) => {
  const rooms = new Set(value.environments.map(room => room.id));
  const ids = new Set(value.floorplan.objects.map(object => object.id));
  if (rooms.size !== value.environments.length || ids.size !== value.floorplan.objects.length)
    context.addIssue({ code: 'custom', message: 'IDs espaciais duplicados.' });
  const references = [...Object.values(value.assignments), ...value.floorplan.objects.map(object => object.roomId), ...(value.floorplan.segments ?? []).map(segment => segment.roomId), ...Object.keys(value.floorplan.roomPositions ?? {}), ...Object.keys(value.floorplan.scales ?? {}), ...Object.keys(value.floorplan.wallHeights ?? {})];
  if (references.some(reference => !rooms.has(reference))) context.addIssue({ code: 'custom', message: 'Ambiente referenciado não existe.' });
  if (Object.keys(value.assignments).length > 600) context.addIssue({ code: 'custom', message: 'Limite de atividades excedido.' });
  if (value.floorplan.segments?.some(segment => segment.x + (segment.axis === 'h' ? 1 : 0) > 12 || segment.y + (segment.axis === 'v' ? 1 : 0) > 8))
    context.addIssue({ code: 'custom', message: 'Parede fora da planta.' });
});
export const spatialDesignSchema = z.object({ version: z.literal(1), serviceId: id, workspaces: z.record(id, spatialWorkspaceSchema) }).passthrough();
export type SpatialWorkspace = z.infer<typeof spatialWorkspaceSchema>;
export type SpatialDesignState = z.infer<typeof spatialDesignSchema>;

import { z } from 'zod';
import type { ServiceGraph } from './model';
import { graphSchema, graphV2Schema, legacyGraphSchema } from './schema';
import { repairGraphReferences } from './integrity';
import { normalizeServiceProjectState } from '../services/service-project';

export const CURRENT_SCHEMA_VERSION=3 as const;
const now=()=>new Date().toISOString();

function v2ToV3(value: z.infer<typeof graphV2Schema>): ServiceGraph {
  const base={...value,schemaVersion:3 as const,entities:value.entities??{},research:value.research??{sources:{},projects:{},observations:{},collections:{},createdAt:now(),updatedAt:now()},integrity:{schemaVersion:3 as const,migratedAt:now()}} as ServiceGraph;
  return repairGraphReferences(base);
}

export function migrateProject(value:unknown):ServiceGraph {
  if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('Arquivo não contém um projeto válido.');
  const version=(value as {schemaVersion?:unknown}).schemaVersion;
  if(version===CURRENT_SCHEMA_VERSION)return normalizeServiceProjectState(graphSchema.parse(value) as ServiceGraph);
  if(version===2)return normalizeServiceProjectState(graphSchema.parse(v2ToV3(graphV2Schema.parse(value))) as ServiceGraph);
  if(version!==undefined)throw new Error(`Versão de dados incompatível: ${String(version)}.`);
  const legacy=legacyGraphSchema.parse(value);
  const v2=graphV2Schema.parse({...legacy,schemaVersion:2,views:{whiteboards:{}},entities:{}});
  return normalizeServiceProjectState(graphSchema.parse(v2ToV3(v2)) as ServiceGraph);
}

export function describeImportError(error:unknown):string {
  if(error instanceof z.ZodError)return `Dados inválidos em ${error.issues[0]?.path.join('.')||'projeto'}: ${error.issues[0]?.message||'verifique o arquivo'}`;
  return error instanceof Error?error.message:'Não foi possível ler o projeto.';
}

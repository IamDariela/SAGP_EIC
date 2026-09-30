import React, { useState } from 'react';
import type { Location } from '../types';
import { croquisSage } from '../assets/croquisSage';

interface Zone {
  id: string;
  name: string;
  rect: { x: number; y: number; w: number; h: number };
}

interface InteractiveFloorPlanProps {
  floor: 1 | 2;
  locations: Location[];
  onLocationSelect: (locationName: string) => void;
}

// Coordenadas medidas sobre el croquis de la segunda planta: 1600 x 900 px.
const FLOOR_2_ZONES: Zone[] = [
  { id: 'ext_dept_acad', name: 'Extensión del Departamento Académico', rect: { x: 129, y: 252, w: 158, h: 158 } },
  { id: 'sig', name: 'Sistema Integrado de Gestión', rect: { x: 335, y: 252, w: 175, h: 158 } },
  { id: 'rh', name: 'Recursos Humanos', rect: { x: 682, y: 252, w: 158, h: 158 } },
  { id: 'ga', name: 'Gestión Académica', rect: { x: 840, y: 252, w: 158, h: 158 } },
  { id: 'gc', name: 'Gestión Curricular', rect: { x: 998, y: 252, w: 158, h: 158 } },
  { id: 'gt', name: 'Gestión Tecnológica', rect: { x: 1156, y: 252, w: 158, h: 158 } },
  { id: 'sala', name: 'Sala de Reuniones', rect: { x: 1314, y: 252, w: 158, h: 396 } },
  { id: 'direccion', name: 'Dirección', rect: { x: 129, y: 430, w: 158, h: 217 } },
  { id: 'cocineta', name: 'Cocineta', rect: { x: 287, y: 490, w: 244, h: 157 } },
  { id: 'banos_h_2', name: 'Baños de hombres (Planta 2)', rect: { x: 580, y: 490, w: 102, h: 79 } },
  { id: 'banos_m_2', name: 'Baños de mujeres (Planta 2)', rect: { x: 531, y: 569, w: 151, h: 78 } },
  { id: 'subdirector', name: 'Subdirector', rect: { x: 682, y: 490, w: 158, h: 157 } },
  { id: 'admin_est', name: 'Administración Estudiantil', rect: { x: 840, y: 490, w: 158, h: 157 } },
  { id: 'dept_acad', name: 'Departamento Académico', rect: { x: 998, y: 490, w: 158, h: 157 } },
];

// Coordenadas medidas sobre el croquis de la primera planta: 800 x 1600 px.
const FLOOR_1_ZONES: Zone[] = [
  { id: 'gimnasio', name: 'Gimnasio', rect: { x: 298, y: 4, w: 167, h: 110 } },
  { id: 'generador', name: 'Generador', rect: { x: 298, y: 118, w: 167, h: 97 } },
  { id: 'parqueo', name: 'Parqueo', rect: { x: 469, y: 4, w: 260, h: 211 } },
  { id: 'ciudadela', name: 'Ciudadela', rect: { x: 54, y: 225, w: 411, h: 261 } },
  { id: 'almacen_2', name: 'Almacén 2', rect: { x: 465, y: 225, w: 97, h: 109 } },
  { id: 'comedor', name: 'Comedor', rect: { x: 562, y: 225, w: 171, h: 109 } },
  { id: 'almacen_1', name: 'Almacén 1', rect: { x: 465, y: 334, w: 97, h: 40 } },
  { id: 'poligono', name: 'Polígono Digital', rect: { x: 465, y: 374, w: 97, h: 112 } },
  { id: 'juicios', name: 'Sala de Juicios Orales', rect: { x: 592, y: 334, w: 141, h: 152 } },
  { id: 'auditorio', name: 'Auditorio', rect: { x: 54, y: 539, w: 198, h: 341 } },
  { id: 'dactiloscopia', name: 'Laboratorio de Dactiloscopía', rect: { x: 316, y: 539, w: 198, h: 167 } },
  { id: 'dorm_4', name: 'Dormitorio 4', rect: { x: 549, y: 539, w: 198, h: 167 } },
  { id: 'documentologia', name: 'Laboratorio de Documentología', rect: { x: 316, y: 706, w: 198, h: 167 } },
  { id: 'dorm_3', name: 'Dormitorio 3', rect: { x: 549, y: 706, w: 198, h: 167 } },
  { id: 'balistica', name: 'Laboratorio de Balística', rect: { x: 316, y: 873, w: 198, h: 167 } },
  { id: 'dorm_2', name: 'Dormitorio 2', rect: { x: 549, y: 873, w: 198, h: 167 } },
  { id: 'aula_3', name: 'Aula 3', rect: { x: 54, y: 880, w: 198, h: 198 } },
  { id: 'aula_2', name: 'Aula 2', rect: { x: 316, y: 1040, w: 198, h: 167 } },
  { id: 'dorm_1', name: 'Dormitorio 1', rect: { x: 549, y: 1040, w: 198, h: 167 } },
  { id: 'informatica', name: 'Laboratorio de Informática', rect: { x: 54, y: 1078, w: 198, h: 197 } },
  { id: 'aula_1', name: 'Aula 1', rect: { x: 316, y: 1207, w: 198, h: 167 } },
  { id: 'dorm_inst', name: 'Dormitorio de Instructores', rect: { x: 549, y: 1207, w: 198, h: 167 } },
  { id: 'servidores', name: 'Servidores', rect: { x: 54, y: 1275, w: 198, h: 62 } },
  { id: 'biblioteca', name: 'Biblioteca', rect: { x: 316, y: 1374, w: 198, h: 191 } },
  { id: 'dorm_damas', name: 'Dormitorio de Damas', rect: { x: 549, y: 1374, w: 198, h: 192 } },
  { id: 'banos_h_1', name: 'Baños de hombres (Planta 1)', rect: { x: 54, y: 1337, w: 73, h: 48 } },
  { id: 'banos_m_1', name: 'Baños de mujeres (Planta 1)', rect: { x: 54, y: 1385, w: 61, h: 61 } },
  { id: 'limpieza', name: 'Cuarto de Limpieza', rect: { x: 127, y: 1337, w: 48, h: 72 } },
  { id: 'archivo', name: 'Archivo', rect: { x: 54, y: 1446, w: 61, h: 119 } },
  { id: 'logistica', name: 'Logística', rect: { x: 115, y: 1446, w: 137, h: 119 } },
];

export default function InteractiveFloorPlan({
  floor,
  onLocationSelect,
}: InteractiveFloorPlanProps) {
  const [imageError, setImageError] = useState<string | null>(null);

  const planInfo = croquisSage[floor];
  const currentZones = floor === 1 ? FLOOR_1_ZONES : FLOOR_2_ZONES;
  const currentImage = planInfo.src;
  const imageWidth = planInfo.width;
  const imageHeight = planInfo.height;

  const handleZoneClick = (zoneName: string) => onLocationSelect(zoneName);

  const handleZoneKeyDown = (
    event: React.KeyboardEvent<SVGGElement>,
    zoneName: string,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleZoneClick(zoneName);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <style>{`
        .eic-floor-zone > rect {
          fill: transparent;
          stroke: transparent;
          transition: fill 150ms ease, stroke 150ms ease;
        }
        .eic-floor-zone:hover > rect,
        .eic-floor-zone:focus > rect {
          fill: rgba(4, 43, 96, 0.20);
          stroke: #042B60;
        }
        .eic-floor-zone:focus { outline: none; }
      `}</style>

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-black text-slate-800 uppercase tracking-tighter">
            Distribución de Espacios - {floor === 1 ? 'Primera Planta' : 'Segunda Planta'}
          </h3>
        </div>

        {/* Imagen y zonas interactivas en un mismo SVG con coordenadas fijas */}
        <div
          style={{
            width: '100%',
            maxWidth: floor === 1 ? 800 : '100%',
            margin: '0 auto',
            backgroundColor: '#fff',
            position: 'relative',
          }}
        >
          {imageError && (
            <div className="p-6 text-center text-slate-600 bg-red-50 border-b border-red-200" role="alert">
              <p className="text-xs font-bold text-red-900 mb-1">
                Error al renderizar el plano de la {floor === 1 ? 'primera' : 'segunda'} planta: {imageError}
              </p>
            </div>
          )}

          <svg
            key={floor}
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            width={imageWidth}
            height={imageHeight}
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
            aria-label={`Plano interactivo de la ${floor === 1 ? 'primera' : 'segunda'} planta`}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              aspectRatio: `${imageWidth} / ${imageHeight}`,
              userSelect: 'none',
              backgroundColor: '#fff',
            }}
          >
            <rect width={imageWidth} height={imageHeight} fill="white" pointerEvents="none" />
            <image
              href={currentImage}
              x={0}
              y={0}
              width={imageWidth}
              height={imageHeight}
              preserveAspectRatio="xMidYMid meet"
              pointerEvents="none"
              onLoad={() => setImageError(null)}
              onError={(e) => setImageError('No se pudo decodificar el recurso de imagen.')}
            />
            {currentZones.map((zone) => (
              <g
                key={zone.id}
                data-zone-id={zone.id}
                className="eic-floor-zone"
                role="button"
                aria-label={zone.name}
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleZoneClick(zone.name);
                }}
                onKeyDown={(event) => handleZoneKeyDown(event, zone.name)}
              >
                <rect
                  x={zone.rect.x}
                  y={zone.rect.y}
                  width={zone.rect.w}
                  height={zone.rect.h}
                  rx={8}
                  ry={8}
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="all"
                />
                <title>{zone.name}</title>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
          Selección rápida por espacio:
        </p>
        <div className="flex flex-wrap gap-2">
          {currentZones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => handleZoneClick(zone.name)}
              className="px-4 py-2 bg-white hover:bg-primary hover:text-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm active:scale-95 flex items-center gap-2 group"
            >
              <div className="h-2 w-2 rounded-full bg-primary/30 group-hover:bg-white" />
              {zone.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

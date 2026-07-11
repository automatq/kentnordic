import { ExtrudeGeometry, ShapeUtils } from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import mapData from '@/data/map-regions.json';

/*
 * Turns the client's 2D map artwork (8 region outlines in a 3000×2100 SVG
 * plane) into extruded 3D plateaus, and provides the single SVG-plane →
 * world-space transform shared by region meshes, route trails, stop pins,
 * and the flythrough camera.
 *
 * World frame: map centered at origin, 2 units wide; SVG x → world x,
 * SVG y (south) → world +z, extrusion hangs below the top face at y=0.
 */

const VB_WIDTH = 3000;
const VB_HEIGHT = 2100;
const WORLD_SCALE = 2 / VB_WIDTH;
const EXTRUDE_DEPTH = 55; // SVG units
const BEVEL_THICKNESS = 6;

export interface RegionGeom {
  slug: string;
  geometry: ExtrudeGeometry;
}

export interface IcelandGeometry {
  regions: RegionGeom[];
  /** Top surface of the plateaus (bevel pushes it slightly above zero). */
  surfaceY: number;
  /** Base of the extrusion — where the ground shadow lives. */
  baseY: number;
  toWorld(x: number, y: number, lift?: number): [number, number, number];
}

let cache: IcelandGeometry | null = null;

export function toWorld(x: number, y: number, lift = 0): [number, number, number] {
  return [(x - VB_WIDTH / 2) * WORLD_SCALE, lift, (y - VB_HEIGHT / 2) * WORLD_SCALE];
}

export function getIcelandGeometry(): IcelandGeometry {
  if (cache) return cache;

  // SVGLoader wants a document; rebuild one from the region path data with
  // slugs recoverable from the parsed nodes.
  const svgText =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_WIDTH} ${VB_HEIGHT}">` +
    mapData.regions.map((r) => `<path data-slug="${r.slug}" d="${r.d}"/>`).join('') +
    `</svg>`;
  const parsed = new SVGLoader().parse(svgText);

  // Drop degenerate slivers (hairline coast fragments) but keep real islands
  // like the Westman Islands and Myvatn's lake ring.
  const minArea = VB_WIDTH * VB_HEIGHT * 0.0001;

  const regions: RegionGeom[] = [];
  for (const path of parsed.paths) {
    const slug = (path.userData?.node as Element | undefined)?.getAttribute('data-slug');
    if (!slug) continue;
    // three r185 moved the fill-rule-aware shape builder onto ShapePath.
    const shapes = path
      .toShapes()
      .filter((shape) => Math.abs(ShapeUtils.area(shape.getPoints())) > minArea);
    if (!shapes.length) continue;
    const geometry = new ExtrudeGeometry(shapes, {
      depth: EXTRUDE_DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL_THICKNESS,
      bevelSize: 4,
      bevelSegments: 2,
      curveSegments: 6,
    });
    // Center in the SVG plane, tip flat into XZ (SVG y/south becomes +z,
    // extrusion becomes -y so the top cap faces up at y≈0), then scale.
    geometry.translate(-VB_WIDTH / 2, -VB_HEIGHT / 2, 0);
    geometry.rotateX(Math.PI / 2);
    geometry.scale(WORLD_SCALE, WORLD_SCALE, WORLD_SCALE);
    geometry.computeVertexNormals();
    regions.push({ slug, geometry });
  }

  cache = {
    regions,
    surfaceY: BEVEL_THICKNESS * WORLD_SCALE,
    baseY: -(EXTRUDE_DEPTH + BEVEL_THICKNESS) * WORLD_SCALE,
    toWorld,
  };
  return cache;
}

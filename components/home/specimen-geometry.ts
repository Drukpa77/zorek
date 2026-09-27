export const POINT_COUNT = 216;

type Vec3 = [number, number, number];
type Point = [number, number, number, number];

export type SculptCloud = {
  p: Point[];
  th: number;
  core: number;
  amp?: number[];
  links?: [number, number][];
};

function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function fibonacci(count: number, radius: number, center: Vec3): Vec3[] {
  const points: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const y = count > 1 ? 1 - (index / (count - 1)) * 2 : 0;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = golden * index;
    points.push([
      center[0] + Math.cos(angle) * ring * radius,
      center[1] + y * radius,
      center[2] + Math.sin(angle) * ring * radius,
    ]);
  }
  return points;
}

function grid(columns: number, rows: number, width: number, height: number, place: (x: number, y: number) => Vec3) {
  const points: Vec3[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      points.push(
        place(-width / 2 + (width * column) / (columns - 1), -height / 2 + (height * row) / (rows - 1)),
      );
    }
  }
  return points;
}

function fill(points: Vec3[]): Point[] {
  const cloud: Point[] = [];
  for (let index = 0; index < POINT_COUNT; index += 1) {
    const point = points[index];
    cloud.push(point ? [point[0], point[1], point[2], 1] : [0, 0, 0, 0]);
  }
  return cloud;
}

export function buildClouds(): Record<string, SculptCloud> {
  const random = rng(11);
  const clouds: Record<string, SculptCloud> = {};

  const shards: number[][] = [];
  for (let index = 0; index < 12; index += 1) {
    const lift = random() * 2 - 1;
    const theta = random() * 6.283;
    const radius = 0.8 + random() * 0.5;
    const span = Math.sqrt(1 - lift * lift);
    shards.push([span * Math.cos(theta) * radius, lift * radius * 0.8, span * Math.sin(theta) * radius, random() * 3]);
  }
  const fragment: Vec3[] = [];
  for (let index = 0; index < POINT_COUNT; index += 1) {
    const shard = shards[index % 12];
    const along = random() * 0.36 - 0.18;
    const rise = random() * 0.36 - 0.18;
    fragment.push([
      shard[0] + along * Math.cos(shard[3]),
      shard[1] + rise,
      shard[2] + along * Math.sin(shard[3]) + (random() - 0.5) * 0.05,
    ]);
  }
  clouds.fragment = { p: fill(fragment), th: 0.2, core: 0.55 };
  clouds.sphere = { p: fill(fibonacci(POINT_COUNT, 1, [0, 0, 0])), th: 0.3, core: 0.62 };

  let platforms: Vec3[] = [];
  (
    [
      [-0.38, 0.28, -0.55],
      [0, 0, 0],
      [0.38, -0.28, 0.55],
    ] as Vec3[]
  ).forEach((offset) => {
    platforms = platforms.concat(grid(8, 5, 1.3, 0.82, (x, y) => [x + offset[0], y + offset[1], offset[2]]));
  });
  clouds.platforms = { p: fill(platforms), th: 0.21, core: 0.12 };

  let nodes: Vec3[] = [];
  const hubs: Vec3[] = [
    [0, 0, 0],
    [0.8, 0.35, 0.2],
    [-0.75, 0.4, -0.3],
    [0.3, -0.7, 0.4],
    [-0.4, -0.6, -0.5],
    [0.2, 0.75, -0.6],
    [-0.9, -0.2, 0.5],
    [0.85, -0.4, -0.5],
  ];
  hubs.forEach((hub) => {
    nodes.push(hub);
    nodes = nodes.concat(fibonacci(26, 0.16, hub));
  });
  clouds.nodes = {
    p: fill(nodes),
    th: 0.19,
    core: 0.18,
    links: (
      [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 5],
        [2, 5],
        [3, 7],
        [4, 6],
        [2, 6],
        [1, 7],
      ] as [number, number][]
    ).map(([a, b]) => [a * 27, b * 27]),
  };

  let layers: Vec3[] = [];
  [-0.62, 0, 0.62].forEach((y) => {
    layers = layers.concat(grid(7, 7, 1.3, 1.3, (x, z) => [x, y, z]));
  });
  clouds.layers = { p: fill(layers), th: 0.23, core: 0.1 };

  const phone: Vec3[] = [];
  const phoneWidth = 0.62;
  const phoneHeight = 1.2;
  const perimeter = 2 * (phoneWidth + phoneHeight);
  for (let index = 0; index < 60; index += 1) {
    const distance = (index / 60) * perimeter;
    let x: number;
    let y: number;
    if (distance < phoneWidth) {
      x = -phoneWidth / 2 + distance;
      y = -phoneHeight / 2;
    } else if (distance < phoneWidth + phoneHeight) {
      x = phoneWidth / 2;
      y = -phoneHeight / 2 + (distance - phoneWidth);
    } else if (distance < 2 * phoneWidth + phoneHeight) {
      x = phoneWidth / 2 - (distance - phoneWidth - phoneHeight);
      y = phoneHeight / 2;
    } else {
      x = -phoneWidth / 2;
      y = phoneHeight / 2 - (distance - 2 * phoneWidth - phoneHeight);
    }
    phone.push([x, y, 0]);
  }
  phone.push(...grid(5, 9, 0.44, 1, (x, y) => [x, y, 0.02]));
  for (let index = 0; index < 72; index += 1) {
    const angle = (index / 72) * 6.283;
    phone.push([Math.cos(angle) * 1.15, Math.sin(angle) * 0.2, Math.sin(angle) * 1.15]);
  }
  clouds.phone = { p: fill(phone), th: 0.13, core: 0 };
  clouds.design = {
    p: fill(
      grid(11, 7, 1.8, 1.1, (x, y) => [x, y, -0.28]).concat(
        grid(11, 7, 1.8, 1.1, (x, y) => [x * 0.96, y * 0.96, 0.28]),
      ),
    ),
    th: 0.2,
    core: 0.1,
  };

  const amp = new Array(POINT_COUNT).fill(0);
  [5, 18, 31, 47, 52, 66, 80, 93, 101, 110].forEach((index) => {
    amp[index] = 1;
  });
  clouds.quality = { p: fill(grid(13, 9, 2, 1.3, (x, y) => [x, y, 0])), th: 0.18, amp, core: 0.12 };

  const cube: Vec3[] = [];
  for (let i = 0; i < 6; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      for (let k = 0; k < 6; k += 1) {
        cube.push([-0.65 + i * 0.26, -0.65 + j * 0.26, -0.65 + k * 0.26]);
      }
    }
  }
  clouds.cube = { p: fill(cube), th: 0.27, core: 0.3 };

  let integrations: Vec3[] = [];
  const clusters: Vec3[] = [
    [-0.85, 0.45, 0],
    [0.85, 0.45, -0.2],
    [-0.6, -0.55, 0.4],
    [0.7, -0.5, 0.3],
  ];
  clusters.forEach((center) => {
    integrations.push(center);
    integrations = integrations.concat(fibonacci(53, 0.26, center));
  });
  clouds.integrations = {
    p: fill(integrations),
    th: 0.15,
    core: 0,
    links: [
      [0, 54],
      [54, 108],
      [108, 162],
      [162, 0],
      [0, 108],
      [54, 162],
    ],
  };

  const growth: Vec3[] = [];
  for (let column = 0; column < 8; column += 1) {
    const x = -0.9 + column * 0.257;
    const height = 0.35 + column * 0.18;
    for (let index = 0; index < 27; index += 1) {
      growth.push([x, -0.8 + (height * index) / 26, (column % 2) * 0.1]);
    }
  }
  clouds.growth = { p: fill(growth), th: 0.09, core: 0 };

  const strategy: Vec3[] = [];
  for (let index = 0; index < 160; index += 1) {
    const t = index / 159;
    strategy.push([-1 + t * 2, -0.6 + t ** 1.6 * 1.2 + Math.sin(t * 9) * 0.05, Math.sin(t * 3.1) * 0.3]);
  }
  [0.1, 0.3, 0.5, 0.72, 0.95].forEach((t) => {
    const base = strategy[Math.round(t * 159)];
    for (let step = 0; step < 10; step += 1) {
      const angle = (step / 10) * 6.283;
      strategy.push([base[0] + Math.cos(angle) * 0.07, base[1] + Math.sin(angle) * 0.07, base[2]]);
    }
  });
  clouds.strategy = { p: fill(strategy), th: 0.045, core: 0.08 };
  clouds.process = clouds.fragment;

  return clouds;
}

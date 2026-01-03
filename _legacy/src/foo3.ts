// const px = [];
// const py = [];
// const pz = [];
// const pxv = [];
// const pyv = [];
// const pzv = [];
//
// const health = [];
//
// const COUNT_1 = 40_000;
//
// for (let i = 0; i < COUNT_1; i++) {
//   px[i] = Math.random() * 1_000;
//   py[i] = Math.random() * 1_000;
//   pz[i] = Math.random() * 1_000;
//   pxv[i] = Math.random() * 2 - 1;
//   pyv[i] = Math.random() * 2 - 1;
//   pzv[i] = Math.random() * 2 - 1;
// }
//
// for (let i = 0; i < COUNT_1; i++) {
//   health[i] = Math.random() * 100;
// }
//
// {
//   const times: number[] = [];
//   for (let iter = 0; iter < 1_000; iter++) {
//     const start = performance.now();
//
//     // Update positions
//     for (let i = 0; i < COUNT_1; i++) {
//       px[i] += pxv[i];
//       py[i] += pyv[i];
//       pz[i] += pzv[i];
//     }
//
//     times.push(performance.now() - start);
//   }
//   const trimmed = times.slice(10);
//   const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
//   console.log("baseline mean avg:", mean);
// }
//
// // ============ ECS ============

const a = [] as number[];
const b = [] as number[];
const c = [] as number[];
const d = [] as number[];
const e = [] as number[];

for (let i = 0; i < 1_000; i++) {
  a[i] = 0;
  b[i] = 1;
  c[i] = 2;
  d[i] = 3;
  e[i] = 4;
}

export default function () {
  for (let i = 0; a.length; i++) {
    a[i] *= 2;
  }
  for (let i = 0; b.length; i++) {
    b[i] *= 2;
  }
  for (let i = 0; c.length; i++) {
    c[i] *= 2;
  }
  for (let i = 0; d.length; i++) {
    d[i] *= 2;
  }
  for (let i = 0; e.length; i++) {
    e[i] *= 2;
  }
}

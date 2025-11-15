// ---------------- helpers ----------------
async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function syncCanvasSize(canvas, w, h) {
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
}

function drawToCanvas(img, canvas, maxW, maxH) {
  let w = img.width, h = img.height;
  if (maxW && w > maxW) { h = Math.round(h * (maxW / w)); w = maxW; }
  if (maxH && h > maxH) { w = Math.round(w * (maxH / h)); h = maxH; }
  syncCanvasSize(canvas, w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function flattenPixels(imageData) {
  const arr = [];
  for (let i = 0; i < imageData.data.length; i += 4)
    arr.push([imageData.data[i], imageData.data[i+1], imageData.data[i+2]]);
  return arr;
}

function createOutputImage(flatPixels, width, height) {
  const canvas = document.createElement("canvas");
  syncCanvasSize(canvas, width, height);
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(width, height);

  for (let i = 0; i < flatPixels.length; i++) {
    const di = i * 4;
    const p = flatPixels[i];
    imgData.data[di] = p[0];
    imgData.data[di+1] = p[1];
    imgData.data[di+2] = p[2];
    imgData.data[di+3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function distanceSquared(a,b){return (a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;}

// ---------------- main match ----------------
async function runMatch(file1,file2,downscale,progressCb){
  const img1 = await loadImage(file1);
  const img2 = await loadImage(file2);

  const targetW = Math.max(1, Math.floor(img2.width / downscale));
  const targetH = Math.max(1, Math.floor(img2.height / downscale));

  const canvas1 = document.getElementById("canvas1");
  const canvas2 = document.getElementById("canvas2");

  const data1 = drawToCanvas(img1, canvas1, targetW, targetH);
  const data2 = drawToCanvas(img2, canvas2, targetW, targetH);

  const flat1 = flattenPixels(data1);
  const flat2 = flattenPixels(data2);

  const N = flat1.length;
  const used = new Uint8Array(flat2.length);
  const mapping = new Array(N);

  for (let i = 0; i < N; i++) {
    let bestDist = Infinity, bestIdx = -1;
    for (let j = 0; j < flat2.length; j++) {
      if (used[j]) continue;
      const d = distanceSquared(flat1[i], flat2[j]);
      if (d < bestDist) { bestDist = d; bestIdx = j; }
    }

    mapping[i] = bestIdx;
    used[bestIdx] = 1;

    if (i % Math.max(1, Math.floor(N / 100)) === 0) {
      if (progressCb) progressCb(`Matched ${i+1}/${N} pixels`);
      await new Promise(requestAnimationFrame); // ← FIX
    }
  }

  const outputPixels = new Array(flat2.length);
  for (let j = 0; j < flat2.length; j++)
    outputPixels[j] = flat1[mapping.indexOf(j)];

  const outCanvas = createOutputImage(outputPixels, canvas2.width, canvas2.height);

  return {
    canvas1, canvas2, outCanvas,
    width: canvas2.width,
    height: canvas2.height,
    flat1, mapping
  };
}

// ---------------- animation ----------------
async function animateLowRes(outCanvas, flat1Low, mappingLow, animRes) {
  const ctx = outCanvas.getContext("2d");
  const W = outCanvas.width;
  const H = outCanvas.height;
  const pxW = W / animRes;
  const pxH = H / animRes;

  // draw starting frame
  for (let i = 0; i < flat1Low.length; i++) {
    const x = (i % animRes) * pxW;
    const y = Math.floor(i / animRes) * pxH;
    const c = flat1Low[i];
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.fillRect(x, y, pxW, pxH);
  }

  await new Promise(r => setTimeout(r, 800));

  await new Promise(resolve => {
    let start = null;

    function frame(ts) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / 1200, 1);

      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < flat1Low.length; i++) {
        const sx = (i % animRes) * pxW;
        const sy = Math.floor(i / animRes) * pxH;
        const di = mappingLow[i];
        const dx = (di % animRes) * pxW;
        const dy = Math.floor(di / animRes) * pxH;
        const x = sx + (dx - sx) * t;
        const y = sy + (dy - sy) * t;
        const c = flat1Low[i];
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(x, y, pxW, pxH);
      }

      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }

    requestAnimationFrame(frame);
  });
}

// ---------------- fade to full ----------------
async function fadeToFull(outCanvas, lowFrame, fullCanvas, duration=900) {
  const W = outCanvas.width;
  const H = outCanvas.height;
  const ctx = outCanvas.getContext("2d");

  return new Promise(resolve => {
    let start = null;

    function step(ts) {
      if (!start) start = ts;
      const t = Math.min((ts - start) / duration, 1);

      ctx.globalAlpha = 1;
      ctx.drawImage(lowFrame, 0, 0, W, H);

      ctx.globalAlpha = t;
      ctx.drawImage(fullCanvas, 0, 0, fullCanvas.width, fullCanvas.height, 0, 0, W, H);

      ctx.globalAlpha = 1;

      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }

    requestAnimationFrame(step);
  });
}

// ---------------- handler ----------------
document.getElementById('run').addEventListener('click', async () => {
  const f1=document.getElementById('file1').files[0];
  const f2=document.getElementById('file2').files[0];
  if (!f1 || !f2) return alert("Select both images");

  const down = Math.max(1, parseInt(document.getElementById('downscale').value) || 4);
  const showAnim = document.getElementById('showAnim').checked;
  const progressEl = document.getElementById('progress');

  progressEl.textContent = "Starting…";

  const result = await runMatch(f1, f2, down, msg => progressEl.textContent = msg);

  // draw previews
  document.getElementById('canvas1').getContext('2d')
    .drawImage(result.canvas1, 0, 0);
  document.getElementById('canvas2').getContext('2d')
    .drawImage(result.canvas2, 0, 0);

  const outCanvas = document.getElementById('canvasOut');
  syncCanvasSize(outCanvas, result.width, result.height);

  if (showAnim) {
    progressEl.textContent = "Building animation…";

    const animRes = Math.max(4, parseInt(document.getElementById('animRes').value) || 32);

    const fullW = result.width;
    const fullH = result.height;
    const fullMap = result.mapping;

    const blockW = Math.floor(fullW / animRes);
    const blockH = Math.floor(fullH / animRes);

    const img1Obj = await loadImage(f1);
    const data1Low = drawToCanvas(img1Obj, document.createElement("canvas"), animRes, animRes);
    const flat1Low = flattenPixels(data1Low);

    const mappingLow = new Array(animRes * animRes);

    function fullIndicesForBlock(bi) {
      const bx = bi % animRes;
      const by = Math.floor(bi / animRes);
      const list = [];
      for (let y = 0; y < blockH; y++) {
        for (let x = 0; x < blockW; x++) {
          const fx = bx * blockW + x;
          const fy = by * blockH + y;
          const fi = fy * fullW + fx;
          if (fi < fullMap.length) list.push(fi);
        }
      }
      return list;
    }

    for (let bi = 0; bi < mappingLow.length; bi++) {
      const pix = fullIndicesForBlock(bi);
      let sumX = 0, sumY = 0;

      for (const fi of pix) {
        const di = fullMap[fi];
        sumX += di % fullW;
        sumY += Math.floor(di / fullW);
      }

      const ax = Math.round(sumX / pix.length);
      const ay = Math.round(sumY / pix.length);

      const bx = Math.floor(ax / blockW);
      const by = Math.floor(ay / blockH);

      mappingLow[bi] =
        Math.max(0, Math.min(animRes*animRes-1, by*animRes + bx));
    }

    progressEl.textContent = "Animating…";

    await animateLowRes(outCanvas, flat1Low, mappingLow, animRes);

    const lowFrame = document.createElement("canvas");
    lowFrame.width = outCanvas.width;
    lowFrame.height = outCanvas.height;
    lowFrame.getContext("2d").drawImage(outCanvas, 0, 0);

    progressEl.textContent = "Sharpening…";

    await fadeToFull(outCanvas, lowFrame, result.outCanvas, 1000);
  }

  outCanvas.getContext("2d")
    .drawImage(result.outCanvas, 0, 0, result.width, result.height,
               0, 0, outCanvas.width, outCanvas.height);

  progressEl.textContent = `Done! Output ${result.width}×${result.height}`;

  const dl = document.getElementById("download");
  dl.disabled = false;
  dl.onclick = () => {
    const a = document.createElement("a");
    a.href = result.outCanvas.toDataURL("image/png");
    a.download = "recreated.png";
    a.click();
  };
});

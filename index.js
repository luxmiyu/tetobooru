const http = require('http')
const path = require('path')
const { createCanvas, loadImage, Image } = require('canvas')

const MINO_PATH = path.join(__dirname, 'mino', 'komino.png')
const MINO_SIZE = 5

const TINTS = {
  o: '#f3e300ff',
  t: '#be1ce4ff',
  i: '#00d9e0ff',
  j: '#0013f9ff',
  l: '#fca607ff',
  s: '#05da36ff',
  z: '#f5170cff',
  g: '#888888ff',
}

function drawImageTinted(ctx, image, x, y, tint) {
  ctx.drawImage(image, x, y)
  ctx.fillStyle = tint
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillRect(x, y, image.width, image.height)
  ctx.globalCompositeOperation = 'source-over'
}

async function generateCanvasBuffer(w = 3, h = 2, m = 'ttt.t.', scale = 1) {
  let image = await loadImage(MINO_PATH)

  const [width, height] = [w * 5, h * 5]
  const minos = m
    .match(new RegExp(`.{1,${w}}`, 'g'))
    .slice(0, h)
    .map((row) => row.padEnd(w, '.')) // split into rows

  // pad with empty rows
  while (minos.length < h) {
    minos.push(Array(w).fill('.'))
  }

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, width, height)

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const mino = minos[j][i]
      const x = i * MINO_SIZE
      const y = j * MINO_SIZE

      if (mino === '.') {
        continue
      } else {
        const tint = TINTS[mino]

        if (tint) {
          drawImageTinted(ctx, image, x, y, tint)
        } else {
          ctx.drawImage(image, x, y)
        }
      }
    }
  }

  if (scale === 1) {
    return canvas.toBuffer('image/png')
  } else {
    const scaledCanvas = createCanvas(width * scale, height * scale)
    const scaledCtx = scaledCanvas.getContext('2d')
    scaledCtx.imageSmoothingEnabled = false
    scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height)
    return scaledCanvas.toBuffer('image/png')
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = url.pathname

    const match = pathname.match(/^\/([0-9]+x[0-9]+)\/([a-zA-Z.]+)$/)
    if (match) {
      const dimensions = match[1]
      const minos = match[2]

      const scale = parseFloat(url.searchParams.get('scale') ?? 1)

      const [w, h] = dimensions.split('x').map(Number)

      try {
        const buffer = await generateCanvasBuffer(w, h, minos, scale)

        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': buffer.length,
        })

        res.end(buffer)
      } catch (error) {
        console.error(error)
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        })
        res.end('Internal Server Error')
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Invalid URL format')
    }
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' })
    res.end('Method not allowed')
  }
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`)
})

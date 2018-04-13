import path from 'path'
import gm from 'gm'
import display from '../src/modules/scripts/display'

const SIZES = [48, 70, 96, 150, 152, 192, 256, 310, 384, 512]
const INPUT_ICON = path.join(__dirname, '../assets/logo.png')
const OUTPUT_DIR = path.join(__dirname, '../server/public/icon')

display.info('Generating Icons')

const promises = SIZES.map(
  size =>
    new Promise((resolve, reject) => {
      gm(INPUT_ICON)
        .resize(size, size)
        .write(path.join(OUTPUT_DIR, `${size}x${size}.png`), err => {
          if (err) {
            reject(err)
            return
          }

          resolve()
          display.success(`Size ${size} created`)
        })
    })
)

Promise.all(promises).catch(err => {
  setTimeout(() => {
    display.error(err)
    throw err
  }, 0)
})

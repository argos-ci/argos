const path = require('path')
const fs = require('fs-extra')
const initializeConfig = require('happo/lib/initializeConfig')
const { config, getLastResultSummary, pathToSnapshot } = require('happo-core')

config.set(initializeConfig())
const resultSummaryJSON = getLastResultSummary()

Promise.all(
  resultSummaryJSON.newImages.map(newImage => {
    const input = pathToSnapshot({
      ...newImage,
      fileName: 'current.png',
    })
    const [suite, name] = newImage.description.split('-')
    const output = path.join(
      config.get().snapshotsFolder,
      suite,
      `${name}-${newImage.viewportName}.png`
    )

    return new Promise((accept, reject) => {
      fs.move(input, output, err => {
        if (err) {
          reject(err)
          return
        }
        fs.remove(input.replace(`/@${newImage.viewportName}/current.png`, ''), err2 => {
          if (err2) {
            reject(err2)
            return
          }
          accept()
        })
      })
    })
  })
)

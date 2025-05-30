// Configure webpack output file path
import path from 'path';
const resolve = (dir) => {
  return path.join(__dirname, dir)
}
module.exports = {
  resolve: {
    alias: {
      '@': resolve('src/render'),
      '@shared': resolve('src/shared'),
      '@lang': resolve('src/lang'),
      '@web': resolve('web')
    }
  }
}

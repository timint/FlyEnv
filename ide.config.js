// Configure webpack output file path
import path from 'path';
const resolve = (dir) => {
  return path.join(path.dirname(new URL(import.meta.url).pathname), dir);
};
export default {
  resolve: {
    alias: {
      '@': resolve('src/render'),
      '@shared': resolve('src/shared'),
      '@lang': resolve('src/lang'),
      '@web': resolve('web')
    }
  }
};

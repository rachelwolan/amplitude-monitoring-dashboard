export default {
  framework: 'astro',
  build: {
    outputDir: './dist'
  },
  environments: {
    production: {
      url: 'https://your-domain.webflow.io'
    },
    development: {
      url: 'http://localhost:3000'
    }
  }
}; 
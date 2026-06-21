const config = {
  stories: ['../stories/**/*.stories.@(js|mjs)'],
  staticDirs: ['../assets'],
  framework: {
    name: '@storybook/html-vite',
    options: {}
  },
  docs: {
    autodocs: true
  }
};

export default config;

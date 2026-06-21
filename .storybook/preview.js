import '../style.css';
import '../stories/storybook.css';

export const parameters = {
  layout: 'fullscreen',
  viewport: {
    viewports: {
      semanticDesktop: {
        name: 'Semantic Map desktop',
        styles: { width: '1200px', height: '800px' }
      },
      semanticMobile: {
        name: 'Semantic Map mobile',
        styles: { width: '390px', height: '844px' }
      }
    }
  },
  backgrounds: {
    default: 'app',
    values: [
      { name: 'app', value: '#071214' },
      { name: 'light', value: '#f4f7f6' }
    ]
  }
};


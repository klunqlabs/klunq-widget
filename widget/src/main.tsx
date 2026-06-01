import { render } from 'preact';
import App from './App';
import './styles.css';

const container = document.createElement('div');
container.id = 'clank-widget-container';
document.body.appendChild(container);

render(<App />, container);

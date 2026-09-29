import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import App from './App';
import './style.less';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ token: { colorPrimary: '#1766a6', borderRadius: 8 } }}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);

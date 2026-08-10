import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ModeProvider } from './context/ModeContext';
import './utils/axiosInterceptor';
import './i18n/config';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/global.css';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <ModeProvider>
        <App />
      </ModeProvider>
    </AuthProvider>
  </BrowserRouter>
);


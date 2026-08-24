/* =========================================================
   AUTENTICACION DEL PANEL
   IMPORTANTE: esta versión es una protección de interfaz.
   Para seguridad real, usar Supabase Auth + RLS.
========================================================= */

const AUTH_USER = 'quintaMewen';
const AUTH_PASSWORD = 'Quinta123.!';
const AUTH_KEY = 'quinta_mewen_auth';

const Auth = {
  login(usuario, password) {
    if (usuario === AUTH_USER && password === AUTH_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1');
      return true;
    }
    return false;
  },

  estaAutenticado() {
    return sessionStorage.getItem(AUTH_KEY) === '1';
  },

  logout() {
    sessionStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
  }
};

if (
  !window.location.pathname.endsWith('/login.html') &&
  !window.location.pathname.endsWith('login.html') &&
  !Auth.estaAutenticado()
) {
  window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', () => {
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', Auth.logout);
  }
});

/* =========================================================
   AUTENTICACION DEL PANEL
   Ahora usa localStorage → queda guardado en el teléfono
   hasta que se cierre sesión manualmente.
========================================================= */

const AUTH_USER = 'quintaMewen';
const AUTH_PASSWORD = 'Quinta123.!';
const AUTH_KEY = 'quinta_mewen_auth';

const Auth = {
  login(usuario, password) {
    if (usuario === AUTH_USER && password === AUTH_PASSWORD) {
      localStorage.setItem(AUTH_KEY, '1');   // ← cambiado a localStorage
      return true;
    }
    return false;
  },

  estaAutenticado() {
    return localStorage.getItem(AUTH_KEY) === '1';  // ← cambiado a localStorage
  },

  logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
  }
};

// Redirigir al login si no está autenticado
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

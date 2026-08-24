/* =========================================================
   AUTENTICACION - Quinta MeWen
   Usa localStorage → queda guardado en el teléfono
========================================================= */

const AUTH_USER = 'quintaMewen';
const AUTH_PASSWORD = 'Quinta123.!';
const AUTH_KEY = 'quinta_mewen_auth';

const Auth = {
  login(usuario, password) {
    if (usuario === AUTH_USER && password === AUTH_PASSWORD) {
      localStorage.setItem(AUTH_KEY, '1');
      return true;
    }
    return false;
  },

  estaAutenticado() {
    return localStorage.getItem(AUTH_KEY) === '1';
  },

  logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
  }
};

// Redirección si no está logueado
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
    btnLogout.addEventListener('click', () => Auth.logout());
  }
});

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

if (
  !window.location.pathname.endsWith('login.html') &&
  !Auth.estaAutenticado()
) {
  window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnLogout');
  if (btn) btn.addEventListener('click', () => Auth.logout());
});

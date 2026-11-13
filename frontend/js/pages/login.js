// Halaman login: email + kata sandi, daftar, lupa kata sandi.
import * as auth from '../auth.js';
import { h, mount, logoSvg } from '../ui.js';

const val = (form, id) => form.querySelector(`#${id}`).value;

function field(id, labelText, attrs) {
  return h('div', { class: 'form-field' },
    h('label', { for: id }, labelText),
    h('input', { id, class: 'text-input', ...attrs }));
}

/**
 * @param {HTMLElement} root
 * @param {{onLoggedIn: Function, mode?: string, message?: string}} opts
 */
export function renderLogin(root, opts) {
  let mode = opts.mode || 'login';
  let message = opts.message ? { type: 'error', text: opts.message } : null;

  const draw = () => {
    const msgBox = message ? h('div', { class: `form-msg ${message.type}`, role: 'alert' }, message.text) : null;
    const card = h('div', { class: 'card login-card' },
      h('div', { class: 'login-hero' },
        h('div', { class: 'brand' }, h('span', { class: 'brand-mark' }, logoSvg()),
          h('span', {}, 'PERSEGI', h('span', { class: 'brand-accent' }, ' GO!'))),
        h('div', { class: 'mini-square', 'aria-hidden': 'true' }, '4'),
        h('p', { class: 'muted' }, 'Petualangan Matematika · Kelas VII')),
      msgBox,
      auth.isDevMode() ? devForm() : forms[mode]());
    mount(root, h('div', { class: 'login-page' }, card));
    root.querySelector('input')?.focus();
  };

  const setMessage = (type, text) => { message = { type, text }; draw(); };
  const switchTo = (next) => { mode = next; message = null; draw(); };

  async function busy(button, task) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Memproses…';
    try {
      await task();
    } catch (err) {
      setMessage('error', auth.friendlyError(err));
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  const forms = {
    login() {
      const form = h('form', { novalidate: true },
        field('email', 'Email', { type: 'email', autocomplete: 'email', required: true, inputmode: 'email' }),
        field('password', 'Kata sandi', { type: 'password', autocomplete: 'current-password', required: true }),
        h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Masuk'));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = val(form, 'email').trim();
        const password = val(form, 'password');
        if (!email || !password) return setMessage('error', 'Isi email dan kata sandi.');
        busy(form.querySelector('button'), async () => {
          await auth.loginEmail(email, password);
          await opts.onLoggedIn();
        });
      });
      return h('div', {},
        form,
        h('div', { class: 'btn-row spread', style: { marginTop: '10px' } },
          h('button', { class: 'link-button', type: 'button', onclick: () => switchTo('forgot') }, 'Lupa kata sandi?'),
          h('button', { class: 'link-button', type: 'button', onclick: () => switchTo('signup') }, 'Daftar akun baru')));
    },

    signup() {
      const form = h('form', { novalidate: true },
        field('name', 'Nama panggilan', { type: 'text', autocomplete: 'nickname', maxlength: 40, required: true }),
        field('email', 'Email (boleh Gmail, iCloud, dll.)', { type: 'email', autocomplete: 'email', required: true, inputmode: 'email' }),
        field('password', 'Kata sandi (minimal 8 karakter)', { type: 'password', autocomplete: 'new-password', minlength: 8, required: true }),
        h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Daftar'));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = val(form, 'name').trim();
        const email = val(form, 'email').trim();
        const password = val(form, 'password');
        if (!name || !email) return setMessage('error', 'Isi nama panggilan dan email.');
        if (password.length < 8) return setMessage('error', 'Kata sandi minimal 8 karakter.');
        busy(form.querySelector('button'), async () => {
          const needsConfirm = await auth.signUp(name, email, password);
          if (needsConfirm) {
            mode = 'login';
            setMessage('ok', `Hampir selesai! Buka email ${email} lalu klik tautan verifikasi. Setelah itu, masuk di sini.`);
          } else {
            await opts.onLoggedIn();
          }
        });
      });
      return h('div', {},
        h('h2', {}, 'Buat akun'),
        form,
        h('p', { class: 'center small', style: { marginTop: '12px' } }, 'Sudah punya akun? ',
          h('button', { class: 'link-button', type: 'button', onclick: () => switchTo('login') }, 'Masuk')));
    },

    forgot() {
      const form = h('form', { novalidate: true },
        field('email', 'Email akunmu', { type: 'email', autocomplete: 'email', required: true, inputmode: 'email' }),
        h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Kirim tautan atur ulang'));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = val(form, 'email').trim();
        if (!email) return setMessage('error', 'Isi email akunmu.');
        busy(form.querySelector('button'), async () => {
          await auth.resetPassword(email);
          mode = 'login';
          setMessage('ok', 'Jika email terdaftar, tautan untuk membuat kata sandi baru sudah dikirim.');
        });
      });
      return h('div', {},
        h('h2', {}, 'Lupa kata sandi'),
        h('p', { class: 'muted small' }, 'Kami akan mengirim tautan untuk membuat kata sandi baru.'),
        form,
        h('p', { class: 'center' }, h('button', { class: 'link-button', type: 'button', onclick: () => switchTo('login') }, '‹ Kembali ke Masuk')));
    },

    newPassword() {
      const form = h('form', { novalidate: true },
        field('password', 'Kata sandi baru (minimal 8 karakter)', { type: 'password', autocomplete: 'new-password', minlength: 8, required: true }),
        h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Simpan kata sandi'));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (val(form, 'password').length < 8) return setMessage('error', 'Kata sandi minimal 8 karakter.');
        busy(form.querySelector('button'), async () => {
          await auth.updatePassword(val(form, 'password'));
          await opts.onLoggedIn();
        });
      });
      return h('div', {}, h('h2', {}, 'Buat kata sandi baru'), form);
    },
  };

  function devForm() {
    const form = h('form', { novalidate: true },
      field('name', 'Nama panggilan', { type: 'text', maxlength: 40, value: 'Penjelajah' }),
      field('email', 'Email (bebas, untuk uji)', { type: 'email', inputmode: 'email', value: 'siswa@contoh.id' }),
      h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Masuk mode uji'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      busy(form.querySelector('button'), async () => {
        await auth.devLogin(val(form, 'name').trim(), val(form, 'email').trim());
        await opts.onLoggedIn();
      });
    });
    return h('div', {},
      h('div', { class: 'dev-banner' },
        h('b', {}, 'Mode uji lokal. '),
        'Supabase belum diatur, jadi login email belum aktif. Isi SUPABASE_URL di file .env (lihat docs/SETUP_AKUN.md).'),
      form);
  }

  draw();
}

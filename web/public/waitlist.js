// The waitlist form. Works without this file too (a plain POST to /api/waitlist); this adds
// the inline confirmation and carries the link's ?src= / utm_* tags so each video's sign-ups
// can be counted (sign-ups per 1K views, GAME_PLAN "Marketing").
(function () {
  var form = document.getElementById('waitlist');
  if (!form) return;
  var status = document.getElementById('status');
  var done = document.getElementById('done');
  var button = form.querySelector('button[type="submit"]');
  var KEYS = ['src', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var STORE = 'locturne-attribution';

  // First touch wins for this tab: someone who opens /privacy and comes back keeps their tag.
  var tags = {};
  try {
    tags = JSON.parse(sessionStorage.getItem(STORE) || '{}') || {};
  } catch (e) {
    tags = {};
  }
  var params = new URLSearchParams(location.search);
  var tagged = KEYS.some(function (k) {
    return tags[k];
  });
  if (!tagged) {
    KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) tags[k] = v.slice(0, 64);
    });
  }
  // Only the referring site's name (tiktok.com), never the full address.
  if (!tags.ref && document.referrer) {
    try {
      var host = new URL(document.referrer).hostname;
      if (host && host !== location.hostname) tags.ref = host;
    } catch (e) {}
  }
  try {
    sessionStorage.setItem(STORE, JSON.stringify(tags));
  } catch (e) {}
  KEYS.concat('ref').forEach(function (k) {
    if (tags[k] && form.elements[k]) form.elements[k].value = tags[k];
  });
  form.elements.t.value = String(Date.now());

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = form.elements.email.value.trim();
    if (!EMAIL.test(email)) {
      status.textContent = 'That email doesn’t look right.';
      form.elements.email.focus();
      return;
    }
    button.disabled = true;
    status.textContent = 'Adding you…';

    var body = {};
    new FormData(form).forEach(function (value, key) {
      body[key] = typeof value === 'string' ? value : '';
    });
    body.email = email;

    fetch(form.action, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error((r.data && r.data.error) || 'failed');
        form.hidden = true;
        done.hidden = false;
        done.focus();
      })
      .catch(function (err) {
        button.disabled = false;
        status.textContent =
          err && err.message === 'invalid_email'
            ? 'That email doesn’t look right.'
            : 'That didn’t go through. Try again in a minute.';
      });
  });
})();

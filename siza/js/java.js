
const API = {
  auth:     'php/auth.php',
  listings: 'php/listings.php',
  messages: 'php/messages.php',
  reviews:  'php/reviews.php',
  bookings: 'php/bookings.php',
  admin:    'php/admin.php',
};


const state = {
  user:          null,  
  listings:      [],     
  categories:    [],     
  filters:       {       
      q:        '',      
      category: '',      
      type:     '',      
      location: '',      
      sort:     'newest',
      page:     1        // page number for pagination
  },
  activeListing: null,   
  chatWith:      null,  
};



async function api(endpoint, params = {}, method = 'GET') {

  try {

      let url = endpoint;

      let options = {
          method: method
      };

      if (method === 'GET') {

          const qs = new URLSearchParams(params).toString();

          if (qs) {
              url = url + '?' + qs;
          }

      } else {

          const fd = new FormData();

          Object.entries(params).forEach(([k, v]) => {
              fd.append(k, v);
          });

          options.body = fd;
      }

      const res = await fetch(url, options);

      return await res.json();

  } catch (error) {

      console.error('API Error:', error);

      return {
          success: false,
          message: 'Network error.'
      };
  }
}


function toast(msg, type = 'info') {

  let container = document.getElementById('toast-container');

  if (!container) {

      container = document.createElement('div');

      container.id = 'toast-container';

      container.style.cssText =
          'position:fixed;' +
          'bottom:24px;' +
          'right:24px;' +
          'z-index:9999;' +
          'display:flex;' +
          'flex-direction:column;' +
          'gap:8px;';

      document.body.appendChild(container);
  }

  const colors = {
      success: '#2d8c5e',
      error:   '#c0392b',
      info:    '#7d6a5a'
  };

  const el = document.createElement('div');

  el.style.cssText =
      'background:'   + (colors[type] || colors.info) + ';' +
      'color:white;' +
      'padding:13px 20px;' +
      'border-radius:8px;' +
      'font-size:14px;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.25);' +
      'max-width:320px;' +
      'line-height:1.4;';

  el.textContent = msg;

  container.appendChild(el);

  setTimeout(function () {

      el.style.opacity    = '0';
      el.style.transition = 'opacity .4s';

      setTimeout(function () {
          el.remove();
      }, 400);

  }, 3200);
}


function stars(avg, count) {

  const n = parseFloat(avg) || 0;

  let html = '<span class="stars">';

  for (let i = 1; i <= 5; i++) {

      if (i <= Math.round(n)) {
          html += '<i class="fas fa-star" style="color:rgb(201,141,0);font-size:.8rem;"></i>';
      } else {
          html += '<i class="far fa-star" style="color:rgb(201,141,0);font-size:.8rem;"></i>';
      }
  }

  html += '</span>';

  if (count !== undefined && count !== null) {
      html += ' <small style="color:#888">(' + count + ')</small>';
  }

  return html;
}


function formatPrice(price, unit) {

  const p = parseFloat(price).toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
  });

  const units = {
      fixed:      '',
      per_hour:   '/hr',
      per_day:    '/day',
      negotiable: ' (neg.)'
  };

  return 'R ' + p + (units[unit] || '');
}


function initials(name) {

  const safeName = name || 'U';

  const words = safeName.split(' ').filter(function (w) {
      return w.length > 0;
  });

  const letters = words.map(function (w) {
      return w[0];
  });

  const combined = letters.join('');

  return combined.slice(0, 2).toUpperCase();
}


function timeAgo(dateStr) {

  const diff = Date.now() - new Date(dateStr);

  // Convert milliseconds into minutes
  const m = Math.floor(diff / 60000);

  if (m < 1) return 'Just now';

  if (m < 60) return m + 'm ago';

  const h = Math.floor(m / 60);

  if (h < 24) return h + 'h ago';

  const d = Math.floor(h / 24);

  if (d < 7) return d + 'd ago';

  const w = Math.floor(d / 7);

  if (w < 4) return w + 'w ago';

  const mo = Math.floor(d / 30);

  if (mo < 12) return mo + 'mo ago';

  // Otherwise show years
  return Math.floor(d / 365) + 'y ago';
}


function typePlaceholder(type) {

  // text label based on the listing type
  const label = type === 'service' ? 'SERVICE' : 'GOODS';

  // background colour based on the listing type
  const bg = type === 'service' ? '#e8f5f0' : '#fdf5e0';

  const color = type === 'service' ? 'rgb(4,120,80)' : 'rgb(120,90,0)';

  // Build and return the placeholder HTML block
  return `<div style="
      width: 100%;
      height: 160px;
      background: ${bg};
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .75rem;
      font-weight: 700;
      letter-spacing: .1em;
      color: ${color};">
      ${label}
  </div>`;
}


async function checkSession() {

  const data = await api(API.auth, { action: 'check' });

  if (data.loggedIn) {

      state.user = data.user;

      updateNavForLoggedInUser();
  }

  return !!data.loggedIn;
}


function updateNavForLoggedInUser() {

  const navBar = document.querySelector('.nav-bar');

  if (!navBar || !state.user) return;

  const firstName = state.user.name.split(' ')[0];

  let html = '';

  html += '<li><a href="dashboard.html" style="font-weight:600;color:rgb(54,26,0);">' + firstName + '</a></li>';

  html += '<li><a href="dashboard.html">Dashboard</a></li>';

  if (state.user.role === 'admin') {
      html += '<li><a href="admin-panel.html">Admin</a></li>';
  }

  html += '<li><a href="#" onclick="handleLogout(event)">Log Out</a></li>';

  navBar.innerHTML = html;

  const addBtn = document.querySelector('.add-btn');

  if (addBtn) {
      addBtn.style.display = 'flex';
  }
}


async function handleLogin(e) {

  if (e) e.preventDefault();

  const form = e ? e.target : document.querySelector('form');

  const emailEl = form.querySelector('[name="email"]') ||
                  form.querySelector('[name="uname"]');

  const email = emailEl ? emailEl.value.trim() : '';

  const pwEl = form.querySelector('[name="psw"]');

  const password = pwEl ? pwEl.value : '';

  const btn = form.querySelector('button[type="submit"]');

  if (!email || !password) {
      toast('Please enter your email and password.', 'error');
      return;
  }

  // Check the email has a basic valid format
  if (!email.includes('@') || !email.includes('.')) {
      toast('Please enter a valid email address.', 'error');
      return;
  }

  // Disable the button and show a loading message while waiting
  if (btn) {
      btn.disabled    = true;
      btn.textContent = 'Signing in...';
  }

  // Sending the login request to the server
  const data = await api(
      API.auth,
      {
          action:   'login',
          email:    email,
          password: password
      },
      'POST'
  );

  if (btn) {
      btn.disabled    = false;
      btn.textContent = 'Login';
  }

  // If the server says login was successful
  if (data.success) {

      // Save the user's basic info into global state
      state.user = {
          name: data.name,
          role: data.role
      };

      // Show a welcome toast notification
      toast('Welcome back, ' + data.name.split(' ')[0] + '!', 'success');

      // Redirect to the home page after a short delay
      setTimeout(function () {
          window.location.href = 'home.html';
      }, 1000);

  } else {

      // Shows the error message returned by the server
      toast(data.message || 'Login failed.', 'error');
  }
}


async function handleRegister(e) {

  if (e) e.preventDefault();

  const form = e ? e.target : document.querySelector('form[name="signup"]');

  // full name input
  const nameEl    = form.querySelector('[name="full_name"]') ||
                    form.querySelector('[name="username"]');
  const full_name = nameEl ? nameEl.value.trim() : '';

  // email input
  const emailEl = form.querySelector('[name="email"]');
  const email   = emailEl ? emailEl.value.trim() : '';

  // phone input
  const phoneEl = form.querySelector('[name="phone"]');
  const phone   = phoneEl ? phoneEl.value.trim() : '';

  // location input
  const locEl    = form.querySelector('[name="location"]');
  const location = locEl ? locEl.value.trim() : '';

  // selected role will default to 'buyer' if not found
  const roleEl = form.querySelector('[name="role"]');
  const role   = roleEl ? roleEl.value : 'buyer';

  // password input
  const pwEl     = form.querySelector('[name="psw"]');
  const password = pwEl ? pwEl.value : '';

  // repeated password input
  const pw2El    = form.querySelector('[name="pswRepeat"]');
  const pwRepeat = pw2El ? pw2El.value : '';

  // Checks that the required fields are filled in
  if (!full_name || !email || !password) {
      toast('Please fill in all required fields.', 'error');
      return;
  }

  // Checks that the two passwords match
  if (password !== pwRepeat) {
      toast('Passwords do not match.', 'error');
      return;
  }

  if (password.length < 8) {
      toast('Password must be at least 8 characters.', 'error');
      return;
  }

  if (!email.includes('@') || !email.includes('.')) {
      toast('Please enter a valid email address.', 'error');
      return;
  }

  if (phone && !/^[\d\s\-\+]+$/.test(phone)) {
      toast('Please enter a valid phone number.', 'error');
      return;
  }

  const btn = form.querySelector('button[type="submit"]') ||
              form.querySelector('.signupbtn');

  if (btn) {
      btn.disabled    = true;
      btn.textContent = 'Creating account...';
  }

  // Sends the registration data to the server
  const data = await api(
      API.auth,
      {
          action:    'register',
          full_name: full_name,
          email:     email,
          phone:     phone,
          password:  password,
          role:      role,
          location:  location
      },
      'POST'
  );

  if (btn) {
      btn.disabled    = false;
      btn.textContent = 'Sign Up';
  }

  // If registration was successful
  if (data.success) {

      toast('Account created! Welcome to Siza.', 'success');

      setTimeout(function () {
          window.location.href = 'home.html';
      }, 1000);

  } else {

      toast(data.message || 'Registration failed.', 'error');
  }
}


async function handleLogout(e) {

  if (e) e.preventDefault();

  await api(API.auth, { action: 'logout' }, 'POST');

  state.user = null;

  toast('Logged out. See you soon!', 'info');

  setTimeout(function () {
      window.location.href = 'home.html';
  }, 800);
}


async function loadListings(append) {

  append = append || false;

  const grid = document.getElementById('productList');

  if (!grid) return;

  if (!append) {
      grid.innerHTML = '<p style="padding:30px;color:#888;text-align:center;">Loading listings...</p>';
  }

  const searchInput = document.querySelector('input[name="q"]');
  if (searchInput) {
      state.filters.q = searchInput.value.trim();
  }

  const params = { action: 'list' };

  Object.keys(state.filters).forEach(function (k) {
      if (state.filters[k] !== '' && state.filters[k] !== null) {
          params[k] = state.filters[k];
      }
  });

  const data = await api(API.listings, params);

  if (!data.success) {
      grid.innerHTML = '<p style="padding:30px;color:#888;text-align:center;">Could not load listings. Please try again.</p>';
      return;
  }

  // This updates the global listings array
  state.listings = append
      ? state.listings.concat(data.listings) // Adds to existing
      : data.listings;                         // Replace existing

  // If no listings were found and we are not appending, show a message
  if (!data.listings.length && !append) {
      grid.innerHTML = '<p style="padding:30px;color:#888;text-align:center;">No listings found. Try different filters.</p>';
      return;
  }

  const cards = data.listings.map(function (l) {

      const images = (function () {
          try {
              return JSON.parse(l.images || '[]');
          } catch (err) {
              return [];
          }
      })();

      // If the listing has images, show the first one using the full URL from PHP Otherwise show a coloured placeholder block
      const imgTag = images.length
          ? '<img src="' + images[0] + '" alt="' + l.title + '" style="width:100%;height:160px;object-fit:cover;border-radius:8px;">'
          : typePlaceholder(l.type);

      // Shows a verified label if the seller is verified
      const verifiedBadge = l.seller_verified == 1
          ? '<span style="color:rgb(4,170,109);font-size:.7rem;margin-left:4px;" title="Verified Seller">Verified</span>'
          : '';

      // Colours based on listing type
      const typeColor = l.type === 'service' ? 'rgb(4,170,109)'      : 'rgb(150,100,0)';
      const typeBg    = l.type === 'service' ? 'rgba(4,170,109,.12)' : 'rgba(201,141,0,.12)';

      return '<div class="card" data-category="' + l.category_name + '" onclick="openListing(' + l.id + ')" style="cursor:pointer;">'
          + imgTag
          + '<div class="card-body">'
          + '<span style="display:inline-block;margin-bottom:4px;background:' + typeBg + ';color:' + typeColor + ';padding:2px 8px;border-radius:20px;font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;">' + l.type + '</span>'
          + '<h4>' + l.title + '</h4>'
          + '<p>' + formatPrice(l.price, l.price_unit) + '</p>'
          + '<small>' + l.seller_name + verifiedBadge + ' &bull; ' + (l.location || 'N/A') + '</small>'
          + stars(l.seller_rating)
          + '</div>'
          + '</div>';

  }).join('');

  // Adds cards to the grid
  if (append) {
      grid.insertAdjacentHTML('beforeend', cards); // Add after existing cards
  } else {
      grid.innerHTML = cards; // Replace all existing cards
  }

  // Handle the "Load More" pagination button
  let moreBtn = document.getElementById('siza-load-more');

  if (data.page < data.pages) {

      if (!moreBtn) {

          moreBtn = document.createElement('button');

          moreBtn.id = 'siza-load-more';

          moreBtn.style.cssText =
              'display:block;' +
              'margin:20px auto;' +
              'padding:10px 32px;' +
              'background:rgb(175,153,134);' +
              'color:white;' +
              'border:none;' +
              'border-radius:6px;' +
              'cursor:pointer;' +
              'font-size:.95rem;' +
              'font-family:inherit;';

          moreBtn.textContent = 'Load More';

          // When clicked it goes to the next page and append results
          moreBtn.onclick = function () {
              state.filters.page++;
              loadListings(true);
          };

          grid.parentNode.insertBefore(moreBtn, grid.nextSibling);
      }

  } else if (moreBtn) {

      // remove the button if there are no more buttons
      moreBtn.remove();
  }
}


function handleSearch(e) {

  if (e) e.preventDefault();

  // Always start from page 1 when doing a new search
  state.filters.page = 1;

  loadListings();
}


function wireNavLinks() {

  const catMap = {
      'Cars & Bakkies': '', 'Collectibles': '', 'Home and garden': '',
      'Toys':           '', 'Sporting goods': '', 'Jewelry': '',
      'Electronics':    1,  'Clothing': 2, 'Food': 3, 'Furniture': 4,
      'Tutoring':       5,  'Cleaning': 6, 'Repairs': 7, 'Transport': 8,
      'Hair & Beauty':  9,  'Digital': 10, 'Services': ''
  };

  document.querySelectorAll('.nav-links li a').forEach(function (link) {

      link.addEventListener('click', function (e) {

          e.preventDefault();

          const txt = link.textContent.trim();

          state.filters.category = (catMap[txt] !== undefined) ? catMap[txt] : '';

          state.filters.type = (txt === 'Services') ? 'service' : '';

          state.filters.page = 1;

          document.querySelectorAll('.nav-links li a').forEach(function (l) {
              l.style.fontWeight = '300';
          });
          link.style.fontWeight = '700';

          loadListings();
      });
  });
}


function wireLocationFilter() {

  const select = document.querySelector('.search-group select, .Location select');

  if (!select) return;

  select.addEventListener('change', function () {
      state.filters.location = select.value;
      state.filters.page     = 1;
      loadListings();
  });
}


function openForm() {

  // If not logged in, show an error and redirect to login
  if (!state.user) {
      toast('Please log in to sell an item.', 'error');
      setTimeout(function () {
          window.location.href = 'LogIn.html';
      }, 1000);
      return;
  }

  const overlay = document.getElementById('formOverlay');
  const form    = document.getElementById('productForm');

  if (overlay) {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
  } else if (form) {
      form.style.display = 'block';
  }
}


function closeForm() {

  const overlay = document.getElementById('formOverlay');
  const form    = document.getElementById('productForm');

  if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
  } else if (form) {
      form.style.display = 'none';
  }
}


async function addProduct() {

  const titleEl  = document.getElementById('title');
  const priceEl  = document.getElementById('price');
  const descEl   = document.getElementById('description');
  const locEl    = document.getElementById('location');
  const catEl    = document.getElementById('category');
  const typeEl   = document.getElementById('itemType');
  const unitEl   = document.getElementById('priceUnit');
  const imgInput = document.getElementById('itemImages');

  const title       = titleEl  ? titleEl.value.trim()  : '';
  const price       = priceEl  ? priceEl.value.trim()  : '';
  const description = descEl   ? descEl.value.trim()   : '';
  const location    = locEl    ? locEl.value.trim()    : '';
  const category    = catEl    ? catEl.value           : '1';
  const type        = typeEl   ? typeEl.value          : 'goods';
  const price_unit  = unitEl   ? unitEl.value          : 'fixed';

  if (!title) {
      toast('Please enter an item title.', 'error');
      return;
  }

  if (!description) {
      toast('Please enter a description.', 'error');
      return;
  }

  if (!price || isNaN(price) || +price < 0) {
      toast('Please enter a valid price.', 'error');
      return;
  }

  if (!location) {
      toast('Please enter a location.', 'error');
      return;
  }

  const fd = new FormData();

  fd.append('action',      'create');
  fd.append('title',        title);
  fd.append('description',  description);
  fd.append('price',        parseFloat(price).toFixed(2));
  fd.append('category_id',  category);
  fd.append('type',         type);
  fd.append('location',     location);
  fd.append('price_unit',   price_unit);

  if (imgInput && imgInput.files.length) {
      for (let i = 0; i < imgInput.files.length; i++) {
          fd.append('images[]', imgInput.files[i]);
      }
  }

  const submitBtn = document.getElementById('submitListingBtn');

  if (submitBtn) {
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Posting...';
  }

  try {

      const res  = await fetch('php/listings.php', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.success) {

          toast('Item listed successfully!', 'success');

          closeForm();

          if (titleEl) titleEl.value = '';
          if (priceEl) priceEl.value = '';
          if (descEl)  descEl.value  = '';
          if (locEl)   locEl.value   = '';

          state.filters.page = 1;
          loadListings();

      } else {
          toast('Error: ' + (data.message || 'Could not create listing.'), 'error');
      }

  } catch (err) {

      toast('Could not connect to server. Make sure XAMPP is running.', 'error');

  } finally {

      if (submitBtn) {
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Post Listing';
      }
  }
}


async function openListing(id) {

  let overlay = document.getElementById('siza-listing-overlay');

  if (!overlay) {

      overlay = document.createElement('div');
      overlay.id = 'siza-listing-overlay';

      overlay.style.cssText =
          'position:fixed;' +
          'inset:0;' +
          'background:rgba(0,0,0,.6);' +
          'z-index:1000;' +
          'display:flex;' +
          'align-items:center;' +
          'justify-content:center;' +
          'padding:16px;';

      overlay.innerHTML =
          '<div id="siza-listing-box" style="background:white;border-radius:14px;max-width:640px;width:100%;max-height:88vh;overflow-y:auto;padding:30px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.3);">'
          + '<button onclick="closeListing()" style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#aaa;width:auto;padding:0;line-height:1;" title="Close">X</button>'
          + '<div id="siza-listing-body"><p style="text-align:center;padding:40px;color:#aaa;">Loading...</p></div>'
          + '</div>';

      overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeListing();
      });

      document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const data = await api(API.listings, { action: 'get', id: id });

  const body = document.getElementById('siza-listing-body');

  if (!data.success) {
      body.innerHTML = '<p style="text-align:center;padding:40px;color:#c00;">Could not load listing: '
          + (data.message || 'Unknown error. Check that XAMPP is running and the database is set up.')
          + '</p>';
      return;
  }

  const l = data.listing;
  state.activeListing = l;

  const images = (function () {
      try {
          return JSON.parse(l.images || '[]');
      } catch (err) {
          return [];
      }
  })();

  const imgSection = images.length
      ? '<div style="overflow-x:auto;margin-bottom:1rem;border-radius:10px;overflow:hidden;"><img src="' + images[0] + '" style="width:100%;height:240px;object-fit:cover;border-radius:10px;"></div>'
      : '<div style="height:200px;background:#f5efe8;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;letter-spacing:.1em;color:#999;margin-bottom:1rem;">' + (l.type === 'service' ? 'SERVICE' : 'GOODS') + '</div>';

  let actionButtons = '';

  if (state.user) {

      if (state.user.id == l.seller_id) {

          actionButtons = '<p style="color:#888;font-size:.85rem;margin-top:1rem;">This is your listing.</p>';

      } else {

          actionButtons =
              '<div style="display:flex;gap:10px;margin-top:1rem;flex-wrap:wrap;">'
              + '<button onclick="startChat(' + l.seller_id + ',\'' + l.seller_name + '\',' + l.id + ')" style="background:rgb(4,170,109);flex:1;min-width:140px;color:white;border:none;border-radius:8px;padding:12px;cursor:pointer;font-family:inherit;font-size:.9rem;">Message Seller</button>'
              + (l.type === 'service'
                  ? '<button onclick="openBooking(' + l.id + ',' + l.seller_id + ')" style="background:rgb(201,141,0);flex:1;min-width:140px;color:white;border:none;border-radius:8px;padding:12px;cursor:pointer;font-family:inherit;font-size:.9rem;">Book Service</button>'
                  : '')
              + '</div>';

          if (state.user.role !== 'admin') {

              actionButtons +=
                  '<div style="margin-top:1rem;border-top:1px solid #eee;padding-top:1rem;">'
                  + '<h4 style="margin-bottom:.5rem;font-size:.95rem;">Leave a Review</h4>'
                  + '<div id="star-picker" style="font-size:1.6rem;cursor:pointer;margin-bottom:6px;">'
                  + [1, 2, 3, 4, 5].map(function (n) {
                      return '<span onclick="setReviewRating(' + n + ')" data-val="' + n + '" style="color:#ddd;transition:color .1s;">&#9733;</span>';
                  }).join('')
                  + '</div>'
                  + '<input type="hidden" id="review-rating" value="0">'
                  + '<textarea id="review-comment" placeholder="Share your experience..." style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;resize:vertical;min-height:60px;box-sizing:border-box;font-family:inherit;"></textarea>'
                  + '<button onclick="submitReview(' + l.id + ')" style="margin-top:6px;background:rgb(175,153,134);color:white;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-family:inherit;">Submit Review</button>'
                  + '</div>';
          }
      }

  } else {

      actionButtons = '<button onclick="window.location.href=\'LogIn.html\'" style="background:rgb(4,170,109);color:white;border:none;border-radius:8px;padding:12px;width:100%;margin-top:1rem;cursor:pointer;font-family:inherit;font-size:.95rem;">Log in to Contact Seller</button>';
  }

  const verifiedSpan = l.seller_verified == 1
      ? '<span style="color:rgb(4,170,109);"> Verified</span>'
      : '';

  const typeColor = l.type === 'service' ? 'rgb(4,170,109)'      : 'rgb(150,100,0)';
  const typeBg    = l.type === 'service' ? 'rgba(4,170,109,.12)' : 'rgba(201,141,0,.12)';

  let reviewsHtml = '';

  if (l.reviews && l.reviews.length) {

      reviewsHtml = l.reviews.map(function (r) {
          return '<div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px;">'
              + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
              + '<div style="width:32px;height:32px;border-radius:50%;background:rgb(175,153,134);color:white;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600;">' + initials(r.reviewer_name) + '</div>'
              + '<strong style="font-size:.875rem;">' + r.reviewer_name + '</strong>'
              + stars(r.rating)
              + '<span style="color:#bbb;font-size:.7rem;margin-left:auto;">' + timeAgo(r.created_at) + '</span>'
              + '</div>'
              + '<p style="margin:0;color:#555;font-size:.875rem;line-height:1.5;">' + (r.comment || '') + '</p>'
              + '</div>';
      }).join('');

  } else {
      reviewsHtml = '<p style="color:#bbb;font-size:.875rem;">No reviews yet.</p>';
  }

  body.innerHTML = imgSection
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem;">'
      + '<span style="background:' + typeBg + ';color:' + typeColor + ';padding:3px 10px;border-radius:20px;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;">' + l.type + '</span>'
      + '<span style="background:rgba(175,153,134,.15);color:rgb(100,80,60);padding:3px 10px;border-radius:20px;font-size:.75rem;">' + l.category_name + '</span>'
      + '</div>'
      + '<h2 style="margin:.4rem 0 .3rem;font-size:1.35rem;line-height:1.3;">' + l.title + '</h2>'
      + '<div style="font-size:1.4rem;font-weight:700;color:rgb(4,170,109);margin-bottom:.6rem;">' + formatPrice(l.price, l.price_unit) + '</div>'
      + '<p style="color:#555;line-height:1.7;margin-bottom:.8rem;">' + (l.description || 'No description provided.') + '</p>'
      + '<div style="background:#f9f7f5;border-radius:8px;padding:12px;margin-bottom:.8rem;font-size:.875rem;color:#666;">'
      + '<strong>Seller:</strong> ' + l.seller_name + verifiedSpan + ' &nbsp;|&nbsp;'
      + '<strong>Location:</strong> ' + (l.location || 'Not specified') + ' &nbsp;|&nbsp;'
      + '<strong>Views:</strong> ' + l.views + ' &nbsp;|&nbsp;'
      + stars(l.seller_rating, l.seller_rating_count)
      + '</div>'
      + actionButtons
      + '<div style="margin-top:1.5rem;">'
      + '<h4 style="margin-bottom:.75rem;font-size:1rem;">Reviews (' + (l.reviews ? l.reviews.length : 0) + ')</h4>'
      + reviewsHtml
      + '</div>';
}


function closeListing() {

  const overlay = document.getElementById('siza-listing-overlay');

  if (overlay) {
      overlay.style.display = 'none';
  }

  document.body.style.overflow = '';
}


function setReviewRating(val) {

  const ratingInput = document.getElementById('review-rating');

  if (ratingInput) {
      ratingInput.value = val;
  }

  document.querySelectorAll('#star-picker span').forEach(function (s) {

      s.style.color = parseInt(s.dataset.val) <= val
          ? 'rgb(201,141,0)' // Gold — filled
          : '#ddd';           // Grey — empty
  });
}


async function submitReview(listingId) {

  const ratingEl  = document.getElementById('review-rating');
  const commentEl = document.getElementById('review-comment');

  const rating  = parseInt((ratingEl ? ratingEl.value : '0') || '0');
  const comment = commentEl ? commentEl.value.trim() : '';

  if (!rating) {
      toast('Please select a star rating.', 'error');
      return;
  }

  const data = await api(
      API.reviews,
      {
          action:     'add',
          listing_id: listingId,
          rating:     rating,
          comment:    comment
      },
      'POST'
  );

  if (data.success) {

      toast('Review submitted. Thank you.', 'success');

      openListing(listingId);

  } else {
      toast(data.message || 'Could not submit review.', 'error');
  }
}


function openBooking(listingId, sellerId) {

  closeListing();

  let overlay = document.getElementById('siza-booking-overlay');

  if (!overlay) {

      overlay = document.createElement('div');
      overlay.id = 'siza-booking-overlay';

      overlay.style.cssText =
          'position:fixed;' +
          'inset:0;' +
          'background:rgba(0,0,0,.6);' +
          'z-index:1001;' +
          'display:flex;' +
          'align-items:center;' +
          'justify-content:center;' +
          'padding:16px;';

      const today = new Date().toISOString().split('T')[0];

      overlay.innerHTML =
          '<div style="background:white;border-radius:14px;max-width:440px;width:100%;padding:28px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.3);">'
          + '<button onclick="closeBooking()" style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:1.4rem;cursor:pointer;color:#aaa;width:auto;padding:0;">X</button>'
          + '<h3 style="margin:0 0 1.2rem;font-size:1.1rem;">Book Service</h3>'
          + '<label style="font-size:.85rem;color:#555;display:block;margin-bottom:4px;">Date</label>'
          + '<input type="date" id="bk-date" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:12px;box-sizing:border-box;" min="' + today + '">'
          + '<label style="font-size:.85rem;color:#555;display:block;margin-bottom:4px;">Time</label>'
          + '<input type="time" id="bk-time" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:12px;box-sizing:border-box;">'
          + '<label style="font-size:.85rem;color:#555;display:block;margin-bottom:4px;">Notes (optional)</label>'
          + '<textarea id="bk-notes" placeholder="Any special requirements..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;resize:vertical;min-height:70px;box-sizing:border-box;font-family:inherit;margin-bottom:14px;"></textarea>'
          + '<button id="bk-submit-btn" onclick="submitBooking(' + listingId + ')" style="width:100%;background:rgb(201,141,0);color:white;border:none;border-radius:8px;padding:12px;cursor:pointer;font-family:inherit;font-size:.95rem;">Confirm Booking Request</button>'
          + '</div>';

      overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeBooking();
      });

      document.body.appendChild(overlay);
  }

  const bkDate = document.getElementById('bk-date');
  const bkTime = document.getElementById('bk-time');
  const bkNote = document.getElementById('bk-notes');

  if (bkDate) bkDate.value = '';
  if (bkTime) bkTime.value = '';
  if (bkNote) bkNote.value = '';

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}


function closeBooking() {

  const overlay = document.getElementById('siza-booking-overlay');

  if (overlay) {
      overlay.style.display = 'none';
  }

  document.body.style.overflow = '';
}


async function submitBooking(listingId) {

  const dateEl  = document.getElementById('bk-date');
  const timeEl  = document.getElementById('bk-time');
  const notesEl = document.getElementById('bk-notes');

  const date  = dateEl  ? dateEl.value        : '';
  const time  = timeEl  ? timeEl.value        : '';
  const notes = notesEl ? notesEl.value.trim() : '';

  if (!date) { toast('Please pick a date.', 'error'); return; }
  if (!time) { toast('Please pick a time.', 'error'); return; }

  const btn = document.getElementById('bk-submit-btn');

  if (btn) {
      btn.disabled    = true;
      btn.textContent = 'Sending...';
  }

  const data = await api(
      API.bookings,
      {
          action:       'create',
          listing_id:   listingId,
          booking_date: date,
          booking_time: time,
          notes:        notes
      },
      'POST'
  );

  if (btn) {
      btn.disabled    = false;
      btn.textContent = 'Confirm Booking Request';
  }

  if (data.success) {

      toast('Booking request sent. The seller will confirm.', 'success');
      closeBooking();

  } else {
      toast(data.message || 'Booking failed.', 'error');
  }
}


function openChat() {

  const box = document.getElementById('chatBox');

  if (box) {
      box.style.display = 'flex';
  }
}


function closeChat() {

  const box = document.getElementById('chatBox');

  if (box) {
      box.style.display = 'none';
  }
}


async function startChat(userId, userName, listingId) {

  listingId = listingId || null;

  if (!state.user) {
      toast('Please log in to chat.', 'error');
      return;
  }

  closeListing();

  state.chatWith = {
      id:        userId,
      name:      userName,
      listingId: listingId
  };

  openChat();

  const header = document.querySelector('.chat-header span');

  if (header) {
      header.textContent = 'Chat: ' + userName;
  }

  await loadConversation(userId, listingId);
}


async function loadConversation(userId, listingId) {

  listingId = listingId || null;

  const pane = document.getElementById('chatMessages');

  if (!pane) return;

  pane.innerHTML = '<p style="color:#aaa;font-size:.8rem;padding:8px;text-align:center;">Loading...</p>';

  const params = { action: 'conversation', with: userId };

  if (listingId) {
      params.listing = listingId;
  }

  const data = await api(API.messages, params);

  if (!data.success) {
      pane.innerHTML = '<p style="color:#aaa;font-size:.8rem;padding:8px;">Could not load conversation.</p>';
      return;
  }

  if (!data.messages.length) {

      pane.innerHTML = '<p style="color:#bbb;font-size:.8rem;text-align:center;padding:10px;">Start the conversation.</p>';

  } else {

      pane.innerHTML = data.messages.map(function (m) {

          const isMe = m.sender_id == (state.user ? state.user.id : -1);

          return '<div style="margin-bottom:8px;display:flex;flex-direction:column;align-items:' + (isMe ? 'flex-end' : 'flex-start') + ';">'
              + '<span style="'
              + 'display:inline-block;'
              + 'background:' + (isMe ? 'rgb(4,170,109)' : '#f0ede9') + ';'
              + 'color:'      + (isMe ? 'white'          : '#333')    + ';'
              + 'padding:7px 12px;'
              + 'border-radius:14px;'
              + 'font-size:.82rem;'
              + 'max-width:88%;'
              + 'line-height:1.4;'
              + 'word-break:break-word;">'
              + m.message
              + '</span>'
              + '<div style="font-size:.65rem;color:#bbb;margin-top:2px;">' + timeAgo(m.created_at) + '</div>'
              + '</div>';

      }).join('');
  }

  pane.scrollTop = pane.scrollHeight;
}


async function sendMessage() {

  if (!state.chatWith) {
      toast('No active conversation.', 'error');
      return;
  }

  if (!state.user) {
      toast('Please log in first.', 'error');
      return;
  }

  const input = document.getElementById('chatInput');

  const msg = input ? input.value.trim() : '';

  if (!msg) return;

  const params = {
      action:      'send',
      receiver_id: state.chatWith.id,
      message:     msg
  };

  if (state.chatWith.listingId) {
      params.listing_id = state.chatWith.listingId;
  }

  input.value = '';

  const data = await api(API.messages, params, 'POST');

  if (data.success) {

      loadConversation(state.chatWith.id, state.chatWith.listingId);

  } else {

      toast(data.message || 'Message failed.', 'error');
      if (input) input.value = msg;
  }
}


document.addEventListener('keydown', function (e) {

  if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'chatInput') {

      e.preventDefault();

      sendMessage();
  }
});


function handleCancel() {
  window.history.back();
}


async function loadInbox() {

  const el = document.getElementById('inbox-list');

  if (!el) return;

  el.innerHTML = '<p style="color:#aaa;font-size:.85rem;">Loading...</p>';

  const data = await api(API.messages, { action: 'inbox' });

  if (!data.success || !data.messages.length) {
      el.innerHTML = '<p style="color:#aaa;font-size:.85rem;">No messages yet.</p>';
      return;
  }

  el.innerHTML = data.messages.map(function (m) {

      const unreadDot = !m.is_read
          ? '<span style="width:8px;height:8px;border-radius:50%;background:rgb(201,141,0);flex-shrink:0;"></span>'
          : '';

      const listingRef = m.listing_title
          ? '<div style="font-size:.75rem;color:rgb(175,153,134);margin-bottom:2px;">Re: ' + m.listing_title + '</div>'
          : '';

      return '<div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;background:' + (m.is_read ? 'white' : '#fdfaf7') + ';" onclick="openInboxMessage(' + m.sender_id + ',\'' + m.sender_name + '\',' + (m.listing_id || 'null') + ')">'
          + '<div style="display:flex;align-items:center;gap:10px;">'
          + '<div style="width:36px;height:36px;border-radius:50%;background:rgb(175,153,134);color:white;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:600;flex-shrink:0;">' + initials(m.sender_name) + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="display:flex;justify-content:space-between;">'
          + '<strong style="font-size:.875rem;">' + m.sender_name + '</strong>'
          + '<span style="font-size:.7rem;color:#bbb;">' + timeAgo(m.created_at) + '</span>'
          + '</div>'
          + listingRef
          + '<div style="font-size:.82rem;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + m.message + '</div>'
          + '</div>'
          + unreadDot
          + '</div>'
          + '</div>';

  }).join('');
}


function openInboxMessage(senderId, senderName, listingId) {

  if (!state.user) {
      toast('Please log in to view messages.', 'error');
      return;
  }

  state.chatWith = {
      id:        senderId,
      name:      senderName,
      listingId: listingId
  };

  openChat();

  const header = document.querySelector('.chat-header span');

  if (header) {
      header.textContent = 'Chat: ' + senderName;
  }

  loadConversation(senderId, listingId);
}


async function loadMyBookings(role) {

  const el = document.getElementById('bookings-' + role);

  if (!el) return;

  el.innerHTML = '<p style="color:#aaa;font-size:.85rem;">Loading...</p>';

  const data = await api(API.bookings, { action: 'my_bookings', role: role });

  if (!data.success || !data.bookings.length) {
      el.innerHTML = '<p style="color:#aaa;font-size:.85rem;">No bookings yet.</p>';
      return;
  }

  const statusColors = {
      pending:   '#e6a817',
      confirmed: 'rgb(4,170,109)',
      completed: '#888',
      cancelled: '#c0392b'
  };

  el.innerHTML = data.bookings.map(function (b) {

      const statusColor = statusColors[b.status] || '#aaa';

      const otherLabel = role === 'buyer' ? 'Seller' : 'Buyer';

      let actions = '';

      if (role === 'seller' && b.status === 'pending') {
          actions +=
              '<div style="margin-top:8px;display:flex;gap:6px;">'
              + '<button onclick="updateBookingStatus(' + b.id + ',\'confirmed\')" style="background:rgb(4,170,109);color:white;border:none;border-radius:6px;padding:6px 12px;font-size:.8rem;cursor:pointer;font-family:inherit;">Confirm</button>'
              + '<button onclick="updateBookingStatus(' + b.id + ',\'cancelled\')" style="background:#c0392b;color:white;border:none;border-radius:6px;padding:6px 12px;font-size:.8rem;cursor:pointer;font-family:inherit;">Decline</button>'
              + '</div>';
      }

      if (role === 'seller' && b.status === 'confirmed') {
          actions += '<button onclick="updateBookingStatus(' + b.id + ',\'completed\')" style="margin-top:8px;background:rgb(175,153,134);color:white;border:none;border-radius:6px;padding:6px 12px;font-size:.8rem;cursor:pointer;font-family:inherit;">Mark Complete</button>';
      }

      if (b.status === 'pending' || b.status === 'confirmed') {
          actions += '<button onclick="updateBookingStatus(' + b.id + ',\'cancelled\')" style="margin-top:8px;background:#f0ede9;color:#c0392b;border:none;border-radius:6px;padding:6px 12px;font-size:.8rem;cursor:pointer;font-family:inherit;">Cancel</button>';
      }

      return '<div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">'
          + '<div>'
          + '<strong style="font-size:.9rem;">'  + b.listing_title + '</strong>'
          + '<p style="margin:3px 0;font-size:.8rem;color:#777;">'  + otherLabel + ': ' + b.other_name  + '</p>'
          + '<p style="margin:3px 0;font-size:.8rem;color:#777;">'  + b.booking_date + ' at ' + b.booking_time + '</p>'
          + (b.notes ? '<p style="margin:3px 0;font-size:.78rem;color:#aaa;">' + b.notes + '</p>' : '')
          + '</div>'
          + '<span style="background:' + statusColor + ';color:white;padding:3px 10px;border-radius:20px;font-size:.7rem;text-transform:uppercase;white-space:nowrap;">' + b.status + '</span>'
          + '</div>'
          + actions
          + '</div>';

  }).join('');
}


async function updateBookingStatus(id, status) {

  const data = await api(
      API.bookings,
      {
          action: 'update_status',
          id:     id,
          status: status
      },
      'POST'
  );

  if (data.success) {

      toast('Booking ' + status + '.', 'success');

      loadMyBookings('buyer');
      loadMyBookings('seller');

  } else {
      toast(data.message || 'Failed.', 'error');
  }
}


document.addEventListener('DOMContentLoaded', async function () {

  if (document.getElementById('dash-username')) return;

  await checkSession();

  if (document.getElementById('productList')) {

      loadListings();

      wireNavLinks();

      wireLocationFilter();

      const searchInput = document.querySelector('input[name="q"]');

      if (searchInput) {
          searchInput.addEventListener('keydown', function (e) {
              if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
              }
          });
      }

      const searchBtn = document.getElementById('searchBtn');

      if (searchBtn) {
          searchBtn.addEventListener('click', function (e) {
              e.preventDefault();
              handleSearch();
          });
      }
  }

  const loginForm = (function () {
      const named = document.querySelector('form[name="login"]');
      if (named) return named;
      const f = document.querySelector('form');
      return (f && (f.querySelector('[name="email"]') || f.querySelector('[name="uname"]'))) ? f : null;
  })();

  if (loginForm) {

      loginForm.addEventListener('submit', handleLogin);

      const cancelBtn = loginForm.querySelector('.cancelbtn');
      if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
  }

  const signupForm = document.querySelector('form[name="signup"]');

  if (signupForm) {

      signupForm.addEventListener('submit', handleRegister);

      const cancelBtn = signupForm.querySelector('.cancelbtn');
      if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
  }

});
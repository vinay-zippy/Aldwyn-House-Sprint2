const apiInput = document.querySelector('#api-url');
const arrivalsNode = document.querySelector('#arrivals');
const arrivalCount = document.querySelector('#arrival-count');
const errorNode = document.querySelector('#error');
let arrivals = [];
let selectedReservation;

const api = (path) => `${apiInput.value.replace(/\/$/, '')}${path}`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const formatDate = (value) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month:'short', day:'numeric' });

async function fetchJson(path, options) {
  const response = await fetch(api(path), options);
  if (!response.ok) throw new Error((await response.json()).detail || `Request failed (${response.status})`);
  return response.json();
}

function showError(error) { errorNode.textContent = error.message; }

function renderArrivals() {
  arrivalCount.textContent = arrivals.length;
  arrivalsNode.innerHTML = arrivals.length ? arrivals.map((reservation) => `
    <button class="arrival ${selectedReservation?.id === reservation.id ? 'selected' : ''}" data-id="${reservation.id}">
      <span class="arrival-name">${escapeHtml(reservation.guest?.name || reservation.guest_id)}</span>
      <span class="arrival-meta"><span class="arrival-date">${formatDate(reservation.check_in)}</span>${escapeHtml(reservation.property?.name || 'Upcoming stay')}</span>
    </button>`).join('') : '<p class="empty">No upcoming arrivals found.</p>';
  arrivalsNode.querySelectorAll('.arrival').forEach((button) => button.addEventListener('click', () => selectReservation(button.dataset.id)));
}

async function loadArrivals() {
  arrivals = await fetchJson('/api/v1/reservations?date_from=' + new Date().toISOString().slice(0, 10));
  const details = await Promise.all(arrivals.map(async (reservation) => {
    try { return { ...reservation, ...(await fetchJson(`/api/v1/reservations/${reservation.id}`)) }; } catch { return reservation; }
  }));
  arrivals = details;
  renderArrivals();
  if (arrivals[0]) selectReservation(arrivals[0].id);
}

function renderPreferences(preferences) {
  const highPriority = new Set(preferences.high_priority || []);
  const groups = [
    ['Dietary', preferences.dietary], ['Room', preferences.room_preferences],
    ['Notes', preferences.notes], ['Interests', preferences.interests],
  ];
  const terms = groups.flatMap(([label, values]) => (values || []).map((value) => ({ label, value })));
  document.querySelector('#priority-count').textContent = highPriority.size ? `${highPriority.size} high priority` : 'No priority flags';
  document.querySelector('#preferences').innerHTML = terms.length ? terms.map(({ label, value }) => `<span class="preference ${highPriority.has(value) ? 'high' : ''}" title="${escapeHtml(label)}">${escapeHtml(value)}</span>`).join('') : '<span class="empty">No preferences recorded.</span>';
}

function renderRecommendations(recommendations, reviews) {
  const reviewMap = new Map(reviews.map((review) => [review.amenity_id, review.status]));
  document.querySelector('#recommendation-count').textContent = recommendations.length;
  document.querySelector('#recommendations').innerHTML = recommendations.length ? recommendations.map((recommendation) => {
    const amenity = recommendation.amenity;
    const status = reviewMap.get(amenity.id) || recommendation.status;
    return `<article class="recommendation"><h5>${escapeHtml(amenity.name)}</h5><p>${escapeHtml(amenity.description || 'Personalized amenity recommendation.')}</p><small>${escapeHtml(amenity.category)} · ${escapeHtml(status.replaceAll('_', ' '))}</small><div class="review-actions"><button class="approve" data-review="approved" data-amenity="${amenity.id}">Approve</button><button data-review="rejected" data-amenity="${amenity.id}">Reject</button></div></article>`;
  }).join('') : '<p class="empty">No configured matches. Nothing to recommend.</p>';
  document.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', () => review(button.dataset.amenity, button.dataset.review)));
}

async function selectReservation(id) {
  try {
    selectedReservation = arrivals.find((reservation) => reservation.id === id);
    renderArrivals();
    const [guest, recommendations] = await Promise.all([
      fetchJson(`/api/v1/guests/${selectedReservation.guest_id}`),
      fetchJson(`/api/v1/guests/${selectedReservation.guest_id}/amenity-recommendations?property_id=${encodeURIComponent(selectedReservation.property_id)}`),
    ]);
    document.querySelector('#guest-empty').hidden = true;
    document.querySelector('#guest-detail').hidden = false;
    document.querySelector('#guest-name').textContent = guest.name;
    document.querySelector('#guest-tier').textContent = `${guest.loyalty_tier} member · ${guest.email}`;
    document.querySelector('#guest-status').textContent = selectedReservation.status.replaceAll('_', ' ');
    document.querySelector('#check-in').textContent = formatDate(selectedReservation.check_in);
    document.querySelector('#check-out').textContent = formatDate(selectedReservation.check_out);
    document.querySelector('#reservation-id').textContent = selectedReservation.id.slice(0, 8);
    renderPreferences(guest.preferences);
    renderRecommendations(recommendations, []);
  } catch (error) { showError(error); }
}

async function review(amenityId, status) {
  try {
    await fetchJson(`/api/v1/guests/${selectedReservation.guest_id}/amenity-recommendations/${amenityId}/review`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ status }) });
    await selectReservation(selectedReservation.id);
  } catch (error) { showError(error); }
}

loadArrivals().catch(showError);

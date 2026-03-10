const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ANIME_FILE = path.join(DATA_DIR, 'anime.json');
const LISTS_FILE = path.join(DATA_DIR, 'lists.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const ACTIVITY_FILE = path.join(DATA_DIR, 'activity.json');
const FOLLOWS_FILE = path.join(DATA_DIR, 'follows.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function writeFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

let _nextUserId = null;
let _nextAnimeId = null;

function getNextId(data) {
  if (data.length === 0) return 1;
  return Math.max(...data.map(d => d.id)) + 1;
}

// ── Users ──────────────────────────────────────────────────────────────────

function findUserByGoogleId(googleId) {
  return readFile(USERS_FILE).find(u => u.google_id === googleId) || null;
}

function findUserById(id) {
  return readFile(USERS_FILE).find(u => u.id === parseInt(id)) || null;
}

function findUserByUsername(username) {
  const lower = username.toLowerCase();
  return readFile(USERS_FILE).find(u => u.username && u.username.toLowerCase() === lower) || null;
}

function createUser({ google_id, email, name, avatar }) {
  const users = readFile(USERS_FILE);
  const user = {
    id: getNextId(users),
    google_id,
    email,
    name,
    avatar: avatar || null,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  writeFile(USERS_FILE, users);
  return user;
}

function updateUser(googleId, { name, avatar }) {
  const users = readFile(USERS_FILE);
  const idx = users.findIndex(u => u.google_id === googleId);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], name, avatar: avatar || users[idx].avatar };
  writeFile(USERS_FILE, users);
  return users[idx];
}

// ── Anime list ─────────────────────────────────────────────────────────────

function getUserAnimeList(userId) {
  return readFile(ANIME_FILE)
    .filter(a => a.user_id === parseInt(userId))
    .sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
}

function getAnimeEntry(userId, malId) {
  return readFile(ANIME_FILE)
    .find(a => a.user_id === parseInt(userId) && a.mal_id === parseInt(malId)) || null;
}

function upsertAnime(userId, { mal_id, title, image_url, status, score }) {
  const list = readFile(ANIME_FILE);
  const idx = list.findIndex(a => a.user_id === parseInt(userId) && a.mal_id === parseInt(mal_id));

  if (idx !== -1) {
    list[idx] = {
      ...list[idx],
      title,
      image_url: image_url || list[idx].image_url,
      status,
      score: score !== undefined ? score : list[idx].score,
    };
    writeFile(ANIME_FILE, list);
    return list[idx];
  }

  const entry = {
    id: getNextId(list),
    user_id: parseInt(userId),
    mal_id: parseInt(mal_id),
    title,
    image_url: image_url || null,
    status,
    score: score || null,
    added_at: new Date().toISOString(),
  };
  list.push(entry);
  writeFile(ANIME_FILE, list);
  return entry;
}

function updateAnimeStatus(userId, malId, status) {
  const list = readFile(ANIME_FILE);
  const idx = list.findIndex(a => a.user_id === parseInt(userId) && a.mal_id === parseInt(malId));
  if (idx === -1) return null;
  list[idx].status = status;
  writeFile(ANIME_FILE, list);
  return list[idx];
}

function updateAnimeEntry(userId, malId, updates) {
  const list = readFile(ANIME_FILE);
  const idx = list.findIndex(a => a.user_id === parseInt(userId) && a.mal_id === parseInt(malId));
  if (idx === -1) return null;
  if (updates.status !== undefined) list[idx].status = updates.status;
  if (updates.score !== undefined) list[idx].score = updates.score;
  writeFile(ANIME_FILE, list);
  return list[idx];
}

function removeAnime(userId, malId) {
  const list = readFile(ANIME_FILE);
  const before = list.length;
  const filtered = list.filter(a => !(a.user_id === parseInt(userId) && a.mal_id === parseInt(malId)));
  if (filtered.length === before) return false;
  writeFile(ANIME_FILE, filtered);
  return true;
}

function updateProfile(userId, updates) {
  const users = readFile(USERS_FILE);
  const idx = users.findIndex(u => u.id === parseInt(userId));
  if (idx === -1) return null;
  const allowed = ['bio', 'cover_type', 'cover_value', 'pinned_mal_ids', 'username'];
  for (const key of allowed) {
    if (updates[key] !== undefined) users[idx][key] = updates[key];
  }
  writeFile(USERS_FILE, users);
  return users[idx];
}

// ── Custom Lists ────────────────────────────────────────────────────────────

function getUserLists(userId) {
  return readFile(LISTS_FILE).filter(l => l.user_id === parseInt(userId));
}

function getListById(id) {
  return readFile(LISTS_FILE).find(l => l.id === parseInt(id)) || null;
}

function createList(userId, { name, description, is_public }) {
  const lists = readFile(LISTS_FILE);
  const list = {
    id: getNextId(lists),
    user_id: parseInt(userId),
    name: name.slice(0, 100),
    description: (description || '').slice(0, 300),
    is_public: Boolean(is_public),
    anime: [],
    created_at: new Date().toISOString(),
  };
  lists.push(list);
  writeFile(LISTS_FILE, lists);
  return list;
}

function updateList(id, userId, updates) {
  const lists = readFile(LISTS_FILE);
  const idx = lists.findIndex(l => l.id === parseInt(id) && l.user_id === parseInt(userId));
  if (idx === -1) return null;
  if (updates.name !== undefined) lists[idx].name = updates.name.slice(0, 100);
  if (updates.description !== undefined) lists[idx].description = updates.description.slice(0, 300);
  if (updates.is_public !== undefined) lists[idx].is_public = Boolean(updates.is_public);
  writeFile(LISTS_FILE, lists);
  return lists[idx];
}

function deleteList(id, userId) {
  const lists = readFile(LISTS_FILE);
  const idx = lists.findIndex(l => l.id === parseInt(id) && l.user_id === parseInt(userId));
  if (idx === -1) return false;
  lists.splice(idx, 1);
  writeFile(LISTS_FILE, lists);
  return true;
}

function addAnimeToList(listId, userId, { mal_id, title, image_url }) {
  const lists = readFile(LISTS_FILE);
  const idx = lists.findIndex(l => l.id === parseInt(listId) && l.user_id === parseInt(userId));
  if (idx === -1) return null;
  if (!lists[idx].anime.find(a => a.mal_id === parseInt(mal_id))) {
    lists[idx].anime.push({ mal_id: parseInt(mal_id), title, image_url: image_url || null });
    writeFile(LISTS_FILE, lists);
  }
  return lists[idx];
}

function removeAnimeFromList(listId, userId, mal_id) {
  const lists = readFile(LISTS_FILE);
  const idx = lists.findIndex(l => l.id === parseInt(listId) && l.user_id === parseInt(userId));
  if (idx === -1) return null;
  lists[idx].anime = lists[idx].anime.filter(a => a.mal_id !== parseInt(mal_id));
  writeFile(LISTS_FILE, lists);
  return lists[idx];
}

// ── Reviews ─────────────────────────────────────────────────────────────────

function getUserReview(userId, malId) {
  return readFile(REVIEWS_FILE)
    .find(r => r.user_id === parseInt(userId) && r.mal_id === parseInt(malId)) || null;
}

function getUserReviews(userId) {
  return readFile(REVIEWS_FILE)
    .filter(r => r.user_id === parseInt(userId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getAnimeReviews(malId) {
  return readFile(REVIEWS_FILE)
    .filter(r => r.mal_id === parseInt(malId) && r.is_public)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function createOrUpdateReview(userId, { mal_id, anime_title, anime_image, text, score, is_public }) {
  const reviews = readFile(REVIEWS_FILE);
  const idx = reviews.findIndex(r => r.user_id === parseInt(userId) && r.mal_id === parseInt(mal_id));
  if (idx !== -1) {
    reviews[idx] = { ...reviews[idx], anime_title, anime_image, text, score, is_public, updated_at: new Date().toISOString() };
    writeFile(REVIEWS_FILE, reviews);
    return reviews[idx];
  }
  const review = {
    id: getNextId(reviews),
    user_id: parseInt(userId),
    mal_id: parseInt(mal_id),
    anime_title,
    anime_image: anime_image || null,
    text: (text || '').slice(0, 1000),
    score,
    is_public: Boolean(is_public),
    created_at: new Date().toISOString(),
  };
  reviews.push(review);
  writeFile(REVIEWS_FILE, reviews);
  return review;
}

function deleteReview(userId, malId) {
  const reviews = readFile(REVIEWS_FILE);
  const before = reviews.length;
  const filtered = reviews.filter(r => !(r.user_id === parseInt(userId) && r.mal_id === parseInt(malId)));
  if (filtered.length === before) return false;
  writeFile(REVIEWS_FILE, filtered);
  return true;
}

// ── Activity ─────────────────────────────────────────────────────────────────

function logActivity(userId, type, data) {
  const activity = readFile(ACTIVITY_FILE);
  const entry = {
    id: getNextId(activity),
    user_id: parseInt(userId),
    type,
    data,
    created_at: new Date().toISOString(),
  };
  activity.push(entry);
  // keep only last 500 entries total to avoid unbounded growth
  if (activity.length > 500) activity.splice(0, activity.length - 500);
  writeFile(ACTIVITY_FILE, activity);
  return entry;
}

function getUserActivity(userId, limit = 30) {
  return readFile(ACTIVITY_FILE)
    .filter(a => a.user_id === parseInt(userId))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

function getFeedActivity(userId, limit = 50) {
  const following = readFile(FOLLOWS_FILE)
    .filter(f => f.follower_id === parseInt(userId))
    .map(f => f.following_id);
  if (following.length === 0) return [];
  return readFile(ACTIVITY_FILE)
    .filter(a => following.includes(a.user_id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

// ── Follows ──────────────────────────────────────────────────────────────────

function isFollowing(followerId, followingId) {
  return readFile(FOLLOWS_FILE)
    .some(f => f.follower_id === parseInt(followerId) && f.following_id === parseInt(followingId));
}

function followUser(followerId, followingId) {
  if (parseInt(followerId) === parseInt(followingId)) return null;
  const follows = readFile(FOLLOWS_FILE);
  if (follows.some(f => f.follower_id === parseInt(followerId) && f.following_id === parseInt(followingId))) {
    return { already: true };
  }
  follows.push({ follower_id: parseInt(followerId), following_id: parseInt(followingId), created_at: new Date().toISOString() });
  writeFile(FOLLOWS_FILE, follows);
  return { ok: true };
}

function unfollowUser(followerId, followingId) {
  const follows = readFile(FOLLOWS_FILE);
  const before = follows.length;
  const filtered = follows.filter(f => !(f.follower_id === parseInt(followerId) && f.following_id === parseInt(followingId)));
  if (filtered.length === before) return false;
  writeFile(FOLLOWS_FILE, filtered);
  return true;
}

function getFollowers(userId) {
  return readFile(FOLLOWS_FILE).filter(f => f.following_id === parseInt(userId)).map(f => f.follower_id);
}

function getFollowing(userId) {
  return readFile(FOLLOWS_FILE).filter(f => f.follower_id === parseInt(userId)).map(f => f.following_id);
}

// ── Discover ─────────────────────────────────────────────────────────────────

function getDiscoverUsers() {
  const users = readFile(USERS_FILE);
  const anime = readFile(ANIME_FILE);
  return users.map(u => {
    const count = anime.filter(a => a.user_id === u.id).length;
    return { id: u.id, name: u.name, username: u.username || null, avatar: u.avatar || null, anime_count: count };
  }).filter(u => u.anime_count > 0);
}

module.exports = {
  getUserLists, getListById, createList, updateList, deleteList,
  addAnimeToList, removeAnimeFromList,
  findUserByGoogleId,
  findUserById,
  findUserByUsername,
  createUser,
  updateUser,
  updateProfile,
  getUserAnimeList,
  getAnimeEntry,
  upsertAnime,
  updateAnimeStatus,
  updateAnimeEntry,
  removeAnime,
  getUserReview, getUserReviews, getAnimeReviews, createOrUpdateReview, deleteReview,
  logActivity, getUserActivity, getFeedActivity,
  isFollowing, followUser, unfollowUser, getFollowers, getFollowing,
  getDiscoverUsers,
};

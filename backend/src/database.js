const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

mongoose.connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// Convert Mongoose document or lean object to plain object with string id
function toObj(doc) {
  if (!doc) return null;
  if (Array.isArray(doc)) return doc.map(toObj);
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ versionKey: false }) : { ...doc };
  if (obj._id !== undefined) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  // Convert ObjectId reference fields to strings
  if (obj.user_id && typeof obj.user_id !== 'string') obj.user_id = obj.user_id.toString();
  if (obj.follower_id && typeof obj.follower_id !== 'string') obj.follower_id = obj.follower_id.toString();
  if (obj.following_id && typeof obj.following_id !== 'string') obj.following_id = obj.following_id.toString();
  return obj;
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  google_id: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  avatar: String,
  bio: String,
  cover_type: String,
  cover_value: String,
  pinned_mal_ids: [Number],
  username: { type: String, unique: true, sparse: true },
  created_at: { type: Date, default: Date.now },
});

const AnimeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  mal_id: { type: Number, required: true },
  title: { type: String, required: true },
  image_url: String,
  status: { type: String, required: true },
  score: Number,
  added_at: { type: Date, default: Date.now },
});
AnimeSchema.index({ user_id: 1, mal_id: 1 }, { unique: true });

const ListSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 300 },
  is_public: { type: Boolean, default: true },
  anime: [{ mal_id: Number, title: String, image_url: String, _id: false }],
  created_at: { type: Date, default: Date.now },
});

const ReviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  mal_id: { type: Number, required: true },
  anime_title: String,
  anime_image: String,
  text: { type: String, default: '', maxlength: 1000 },
  score: Number,
  is_public: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
});
ReviewSchema.index({ user_id: 1, mal_id: 1 }, { unique: true });

const ActivitySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: String,
  data: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now },
});
ActivitySchema.index({ user_id: 1 });

const FollowSchema = new mongoose.Schema({
  follower_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  following_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  created_at: { type: Date, default: Date.now },
});
FollowSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
const Anime = mongoose.model('Anime', AnimeSchema);
const List = mongoose.model('List', ListSchema);
const Review = mongoose.model('Review', ReviewSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Follow = mongoose.model('Follow', FollowSchema);

// ── Users ──────────────────────────────────────────────────────────────────

async function findUserByGoogleId(googleId) {
  return toObj(await User.findOne({ google_id: googleId }).lean());
}

async function findUserById(id) {
  try {
    return toObj(await User.findById(id).lean());
  } catch {
    return null;
  }
}

async function findUserByUsername(username) {
  return toObj(await User.findOne({ username: username.toLowerCase() }).lean());
}

async function createUser({ google_id, email, name, avatar }) {
  const user = await User.create({ google_id, email, name, avatar: avatar || null });
  return toObj(user.toObject());
}

async function updateUser(googleId, { name, avatar }) {
  const update = { name };
  if (avatar) update.avatar = avatar;
  const user = await User.findOneAndUpdate({ google_id: googleId }, { $set: update }, { new: true }).lean();
  return toObj(user);
}

async function updateProfile(userId, updates) {
  const setData = {};
  const allowed = ['bio', 'cover_type', 'cover_value', 'pinned_mal_ids', 'username'];
  for (const key of allowed) {
    if (updates[key] !== undefined) setData[key] = updates[key];
  }
  const user = await User.findByIdAndUpdate(userId, { $set: setData }, { new: true }).lean();
  return toObj(user);
}

// ── Anime list ─────────────────────────────────────────────────────────────

async function getUserAnimeList(userId) {
  const list = await Anime.find({ user_id: userId }).sort({ added_at: -1 }).lean();
  return toObj(list);
}

async function getAnimeEntry(userId, malId) {
  return toObj(await Anime.findOne({ user_id: userId, mal_id: parseInt(malId) }).lean());
}

async function upsertAnime(userId, { mal_id, title, image_url, status, score }) {
  const malId = parseInt(mal_id);
  const setData = { title, status };
  if (image_url) setData.image_url = image_url;
  if (score !== undefined) setData.score = score;

  const entry = await Anime.findOneAndUpdate(
    { user_id: userId, mal_id: malId },
    { $set: setData, $setOnInsert: { added_at: new Date() } },
    { upsert: true, new: true }
  ).lean();
  return toObj(entry);
}

async function updateAnimeStatus(userId, malId, status) {
  const entry = await Anime.findOneAndUpdate(
    { user_id: userId, mal_id: parseInt(malId) },
    { $set: { status } },
    { new: true }
  ).lean();
  return toObj(entry);
}

async function updateAnimeEntry(userId, malId, updates) {
  const entry = await Anime.findOneAndUpdate(
    { user_id: userId, mal_id: parseInt(malId) },
    { $set: updates },
    { new: true }
  ).lean();
  return toObj(entry);
}

async function removeAnime(userId, malId) {
  const result = await Anime.deleteOne({ user_id: userId, mal_id: parseInt(malId) });
  return result.deletedCount > 0;
}

// ── Custom Lists ────────────────────────────────────────────────────────────

async function getUserLists(userId) {
  return toObj(await List.find({ user_id: userId }).lean());
}

async function getListById(id) {
  try {
    return toObj(await List.findById(id).lean());
  } catch {
    return null;
  }
}

async function createList(userId, { name, description, is_public }) {
  const list = await List.create({
    user_id: userId,
    name: name.slice(0, 100),
    description: (description || '').slice(0, 300),
    is_public: Boolean(is_public),
    anime: [],
  });
  return toObj(list.toObject());
}

async function updateList(id, userId, updates) {
  const setData = {};
  if (updates.name !== undefined) setData.name = updates.name.slice(0, 100);
  if (updates.description !== undefined) setData.description = updates.description.slice(0, 300);
  if (updates.is_public !== undefined) setData.is_public = Boolean(updates.is_public);
  try {
    const list = await List.findOneAndUpdate({ _id: id, user_id: userId }, { $set: setData }, { new: true }).lean();
    return toObj(list);
  } catch {
    return null;
  }
}

async function deleteList(id, userId) {
  try {
    const result = await List.deleteOne({ _id: id, user_id: userId });
    return result.deletedCount > 0;
  } catch {
    return false;
  }
}

async function addAnimeToList(listId, userId, { mal_id, title, image_url }) {
  const malId = parseInt(mal_id);
  try {
    const list = await List.findOne({ _id: listId, user_id: userId });
    if (!list) return null;
    if (!list.anime.find(a => a.mal_id === malId)) {
      list.anime.push({ mal_id: malId, title, image_url: image_url || null });
      await list.save();
    }
    return toObj(list.toObject());
  } catch {
    return null;
  }
}

async function removeAnimeFromList(listId, userId, mal_id) {
  const malId = parseInt(mal_id);
  try {
    const list = await List.findOneAndUpdate(
      { _id: listId, user_id: userId },
      { $pull: { anime: { mal_id: malId } } },
      { new: true }
    ).lean();
    return toObj(list);
  } catch {
    return null;
  }
}

// ── Reviews ─────────────────────────────────────────────────────────────────

async function getUserReview(userId, malId) {
  return toObj(await Review.findOne({ user_id: userId, mal_id: parseInt(malId) }).lean());
}

async function getUserReviews(userId) {
  return toObj(await Review.find({ user_id: userId }).sort({ created_at: -1 }).lean());
}

async function getAnimeReviews(malId) {
  return toObj(await Review.find({ mal_id: parseInt(malId), is_public: true }).sort({ created_at: -1 }).lean());
}

async function createOrUpdateReview(userId, { mal_id, anime_title, anime_image, text, score, is_public }) {
  const review = await Review.findOneAndUpdate(
    { user_id: userId, mal_id: parseInt(mal_id) },
    {
      $set: { anime_title, anime_image, text, score, is_public, updated_at: new Date() },
      $setOnInsert: { created_at: new Date() },
    },
    { upsert: true, new: true }
  ).lean();
  return toObj(review);
}

async function deleteReview(userId, malId) {
  const result = await Review.deleteOne({ user_id: userId, mal_id: parseInt(malId) });
  return result.deletedCount > 0;
}

// ── Activity ─────────────────────────────────────────────────────────────────

async function logActivity(userId, type, data) {
  const entry = await Activity.create({ user_id: userId, type, data });
  return toObj(entry.toObject());
}

async function getUserActivity(userId, limit = 30) {
  return toObj(await Activity.find({ user_id: userId }).sort({ created_at: -1 }).limit(limit).lean());
}

async function getFeedActivity(userId, limit = 50) {
  const follows = await Follow.find({ follower_id: userId }).lean();
  if (follows.length === 0) return [];
  const followingIds = follows.map(f => f.following_id);
  return toObj(await Activity.find({ user_id: { $in: followingIds } }).sort({ created_at: -1 }).limit(limit).lean());
}

// ── Follows ──────────────────────────────────────────────────────────────────

async function isFollowing(followerId, followingId) {
  const follow = await Follow.findOne({ follower_id: followerId, following_id: followingId });
  return !!follow;
}

async function followUser(followerId, followingId) {
  if (followerId.toString() === followingId.toString()) return null;
  try {
    await Follow.create({ follower_id: followerId, following_id: followingId });
    return { ok: true };
  } catch (err) {
    if (err.code === 11000) return { already: true };
    throw err;
  }
}

async function unfollowUser(followerId, followingId) {
  const result = await Follow.deleteOne({ follower_id: followerId, following_id: followingId });
  return result.deletedCount > 0;
}

async function getFollowers(userId) {
  const follows = await Follow.find({ following_id: userId }).lean();
  return follows.map(f => f.follower_id.toString());
}

async function getFollowing(userId) {
  const follows = await Follow.find({ follower_id: userId }).lean();
  return follows.map(f => f.following_id.toString());
}

// ── Discover ─────────────────────────────────────────────────────────────────

async function getDiscoverUsers() {
  const [users, counts] = await Promise.all([
    User.find({}).lean(),
    Anime.aggregate([{ $group: { _id: '$user_id', count: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map(c => [c._id.toString(), c.count]));
  return users
    .map(u => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username || null,
      avatar: u.avatar || null,
      anime_count: countMap.get(u._id.toString()) || 0,
    }))
    .filter(u => u.anime_count > 0);
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

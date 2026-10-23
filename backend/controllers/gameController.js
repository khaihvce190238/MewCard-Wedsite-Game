import * as draw from '../services/drawService.js';
import * as fav from '../services/favoriteService.js';
import { ok, created } from '../utils/response.js';
import { int } from '../utils/validate.js';

export const start = async (req, res) => ok(res, await draw.startTopic(req.user.UserID, req.body));
export const drawOne = async (req, res) => ok(res, await draw.drawCard(req.user.UserID, req.body));
export const leave = async (req, res) => ok(res, await draw.leaveTopic(req.user.UserID, req.body));
export const history = async (req, res) => {
  const { rows, meta } = await draw.history(req.user.UserID, req.query);
  ok(res, rows, meta);
};
export const favList = async (req, res) => ok(res, await fav.list(req.user.UserID));
export const favAdd = async (req, res) => {
  await fav.add(req.user.UserID, int(req.params.cardId, 'cardId'));
  created(res, null, { message: 'Đã thêm vào yêu thích' });
};
export const favRemove = async (req, res) => {
  await fav.remove(req.user.UserID, int(req.params.cardId, 'cardId'));
  ok(res, null, { message: 'Đã xóa khỏi yêu thích' });
};

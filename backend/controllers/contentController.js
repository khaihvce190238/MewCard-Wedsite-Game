import * as s from '../services/contentService.js';
import { fileUrl } from '../middlewares/upload.js';
import { ok, created } from '../utils/response.js';
import { int } from '../utils/validate.js';

const id = (req) => int(req.params.id, 'ID');

export const publicTopics = async (req, res) => ok(res, await s.listPublicTopics());
export const publicTopicCards = async (req, res) => ok(res, await s.getPublicTopicCards(id(req)));

export const adminTopics = async (req, res) => ok(res, await s.adminListTopics(req.query));
export const createTopic = async (req, res) => created(res, await s.createTopic(req.body, fileUrl(req.file)), { message: 'Đã thêm chủ đề' });
export const updateTopic = async (req, res) => ok(res, await s.updateTopic(id(req), req.body, fileUrl(req.file)), { message: 'Đã cập nhật chủ đề' });
export const topicStatus = async (req, res) => ok(res, await s.setTopicStatus(id(req), req.body.isActive), { message: 'Đã cập nhật trạng thái' });

export const adminCards = async (req, res) => {
  const { rows, meta } = await s.adminListCards(req.query);
  ok(res, rows, meta);
};
export const createCard = async (req, res) =>
  created(res, await s.createCard(req.body, fileUrl(req.files?.front?.[0]), fileUrl(req.files?.back?.[0])), { message: 'Đã thêm lá bài' });
export const updateCard = async (req, res) =>
  ok(res, await s.updateCard(id(req), req.body, fileUrl(req.files?.front?.[0]), fileUrl(req.files?.back?.[0])), { message: 'Đã cập nhật lá bài' });
export const cardStatus = async (req, res) => ok(res, await s.setCardStatus(id(req), req.body.isActive), { message: 'Đã cập nhật trạng thái' });
export const cardImages = async (req, res) =>
  ok(res, await s.updateCardImages(id(req), fileUrl(req.files?.front?.[0]), fileUrl(req.files?.back?.[0])), { message: 'Đã cập nhật ảnh' });

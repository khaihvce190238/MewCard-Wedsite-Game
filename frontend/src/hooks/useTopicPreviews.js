import { useEffect, useState } from 'react';
import { api } from '../services/api';

// Cache theo TopicID để Home và trang Chủ đề không gọi lại API.
const cache = new Map();

/**
 * API công khai trả `preview`: tối đa 3 lá đầu của chủ đề, mỗi lá có cả mặt trước lẫn mặt sau.
 * (Phần `cards` vẫn chỉ có mặt sau để không lộ cả bộ bài.)
 */
const loadPreviews = (topicId) => {
  if (!cache.has(topicId)) {
    cache.set(
      topicId,
      api.get(`/topics/${topicId}/cards`)
        .then((r) => (r.data.data.preview || [])
          .map((c) => ({ front: c.FrontImageURL, back: c.BackImageURL }))
          .filter((c) => c.front && c.back))
        .catch(() => {
          cache.delete(topicId); // lỗi tạm thời thì cho phép thử lại lần sau
          return [];
        }),
    );
  }
  return cache.get(topicId);
};

/** Trả về { [TopicID]: { front, back }[] } — tối đa 3 lá mỗi chủ đề (chưa tải xong/lỗi thì chưa có khóa hoặc mảng rỗng). */
export function useTopicPreviews(topics) {
  const [previews, setPreviews] = useState({});
  const ids = (topics || []).map((t) => t.TopicID).join(',');

  useEffect(() => {
    let alive = true;
    (topics || []).forEach((t) => {
      loadPreviews(t.TopicID).then((list) => alive && setPreviews((p) => ({ ...p, [t.TopicID]: list })));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return previews;
}
